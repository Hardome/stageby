import { randomUUID } from 'node:crypto';

import fastifyCookie from '@fastify/cookie';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { parseEnvironment } from '#app/config/env';
import { checklistItems, checklists } from '#app/db/schema/checklists';
import { checklistItemPhotos, files, projectDocuments } from '#app/db/schema/files';
import { projects } from '#app/db/schema/projects';
import { sessions } from '#app/db/schema/sessions';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import type { Checklist, FileUpload, Project, Stage } from '#app/generated/types.gen';
import { hashPassword } from '#app/modules/auth/password-hasher';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { cleanupExpiredFiles } from '#app/modules/files/cleanup';
import { fileModule } from '#app/modules/files/index';
import { FileRepository } from '#app/modules/files/repository';
import { materialModule } from '#app/modules/materials/index';
import { projectModule } from '#app/modules/projects/index';
import { stageModule } from '#app/modules/stages/index';
import { UserRepository } from '#app/modules/users/repository';
import { workPaymentModule } from '#app/modules/work-payments/index';
import { registerAuthentication } from '#app/plugins/authentication';
import { registerErrorHandler } from '#app/plugins/error-handler';
import type {
  FileStorage,
  SignedStorageRequest,
  SignedUploadRequest,
  StoredObjectMetadata,
} from '#app/storage/file-storage';
import { auditRecords } from '#test/audit-records';
import { setupModuleTest } from '#test/setup-module-test';

const PASSWORD = 'Files-test-password-123!';
const checksum = 'a'.repeat(32);
const createdUserIds: number[] = [];
const createdProjectIds: number[] = [];
const createdFileIds: number[] = [];
let passwordHash: string;

class FakeFileStorage implements FileStorage {
  readonly objects = new Map<string, StoredObjectMetadata>();
  failNextUploadRequest = false;
  failNextDelete = false;

  async createUploadRequest(input: {
    key: string;
    mimeType: string;
    sizeBytes: number;
    checksumMd5Base64: string;
    expiresInSeconds: number;
  }): Promise<SignedUploadRequest> {
    if (this.failNextUploadRequest) {
      this.failNextUploadRequest = false;
      throw new Error('temporary storage failure');
    }
    return {
      url: `https://storage.test/${encodeURIComponent(input.key)}`,
      headers: {
        'content-type': input.mimeType,
        'content-length': String(input.sizeBytes),
        'content-md5': input.checksumMd5Base64,
      },
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    };
  }

  async createDownloadRequest(input: {
    key: string;
    originalName: string;
    expiresInSeconds: number;
  }): Promise<SignedStorageRequest> {
    return {
      url: `https://storage.test/${encodeURIComponent(input.key)}?download=${encodeURIComponent(input.originalName)}`,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    };
  }

  async getMetadata(key: string): Promise<StoredObjectMetadata | null> {
    return this.objects.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    if (this.failNextDelete) {
      this.failNextDelete = false;
      throw new Error('temporary delete failure');
    }
    this.objects.delete(key);
  }
}

const storage = new FakeFileStorage();

const filesTestModule: FastifyPluginAsync = async (app) => {
  const environment = parseEnvironment({
    NODE_ENV: 'test',
    DATABASE_URL: process.env.DATABASE_URL,
    CORS_ORIGIN: 'http://localhost:5173',
    LOG_LEVEL: 'silent',
  });
  registerErrorHandler(app, environment);
  await app.register(fastifyCookie);
  await registerAuthentication(app);
  await app.register(fileModule, { storage, signedUrlTtlSeconds: 900, cleanupIntervalSeconds: 86_400 });
  await app.register(projectModule);
  await app.register(stageModule);
  await app.register(materialModule);
  await app.register(workPaymentModule);
};

const getApp = setupModuleTest(filesTestModule);

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

afterEach(async () => {
  const app = getApp();
  if (createdProjectIds.length > 0) {
    await app.db.delete(projects).where(inArray(projects.id, createdProjectIds));
    createdProjectIds.length = 0;
  }
  if (createdFileIds.length > 0) {
    await app.db.delete(files).where(inArray(files.id, createdFileIds));
    createdFileIds.length = 0;
  }
  if (createdUserIds.length > 0) {
    await app.db.delete(users).where(inArray(users.id, createdUserIds));
    createdUserIds.length = 0;
  }
  storage.objects.clear();
  storage.failNextDelete = false;
  storage.failNextUploadRequest = false;
});

async function createIdentity(role: 'manager' | 'foreman') {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 20);
  const user = await new UserRepository(getApp().db).create({
    login: `files.${suffix}`,
    passwordHash,
    fullName: `Пользователь ${suffix}`,
    role,
  });
  createdUserIds.push(user.id);
  const issued = await new SessionService(new SessionRepository(getApp().db), 12).issue(user.id);
  return { user, cookie: `stageby_session=${issued.accessToken}` };
}

async function createFixture() {
  const manager = await createIdentity('manager');
  const foreman = await createIdentity('foreman');
  const response = await getApp().inject({
    method: 'POST',
    url: '/projects',
    headers: { cookie: manager.cookie, 'idempotency-key': randomUUID() },
    payload: {
      ownerName: `Клиент ${randomUUID()}`,
      address: 'Екатеринбург, ул. Файловая, 1',
      coordinates: { latitude: 56.84, longitude: 60.61 },
      plannedStartDate: '2026-10-01',
      plannedEndDate: '2026-12-31',
      documentFileIds: [],
      stages: [
        {
          type: 'foundation',
          plannedStartDate: '2026-10-01',
          plannedEndDate: '2026-10-31',
          assigneeId: foreman.user.id,
          plannedWorkAmountMinor: null,
          plannedMaterialAmountMinor: null,
          checklistItems: [{ title: 'Пункт с фотографиями' }],
        },
      ],
    },
  });
  if (response.statusCode !== 201) throw new Error(`Не удалось создать тестовый проект: ${response.body}`);
  const project = response.json<Project>();
  createdProjectIds.push(project.id);
  const [stage] = await getApp().db.select().from(stages).where(eq(stages.projectId, project.id));
  const [checklist] = await getApp().db.select().from(checklists).where(eq(checklists.stageId, stage!.id));
  const [item] = await getApp().db.select().from(checklistItems).where(eq(checklistItems.checklistId, checklist!.id));
  return { manager, foreman, stage: stage!, checklist: checklist!, item: item! };
}

async function uploadPhoto(cookie: string, overrides: Record<string, unknown> = {}) {
  const createResponse = await getApp().inject({
    method: 'POST',
    url: '/file-uploads',
    headers: { cookie },
    payload: {
      purpose: 'checklist_photo',
      originalName: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      checksumMd5: checksum,
      ...overrides,
    },
  });
  if (createResponse.statusCode !== 201) return { createResponse };
  const upload = createResponse.json<FileUpload>();
  createdFileIds.push(upload.fileId);
  const key = decodeURIComponent(new URL(upload.uploadUrl).pathname.slice(1));
  storage.objects.set(key, {
    sizeBytes: Number(upload.headers['content-length']),
    mimeType: upload.headers['content-type']!,
    checksumMd5Hex: Buffer.from(upload.headers['content-md5']!, 'base64').toString('hex'),
  });
  const completeResponse = await getApp().inject({
    method: 'POST',
    url: `/file-uploads/${upload.fileId}/completion`,
    headers: { cookie, 'idempotency-key': randomUUID() },
    payload: { checksumMd5: checksum },
  });
  return { createResponse, completeResponse, upload, key };
}

async function insertUploadedPhotos(userId: number, count: number) {
  const uploadedAt = new Date();
  const inserted = await getApp()
    .db.insert(files)
    .values(
      Array.from({ length: count }, (_, index) => ({
        status: 'uploaded' as const,
        purpose: 'checklist_photo' as const,
        storageKey: `tests/files/${randomUUID()}`,
        originalName: `photo-${index}.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        checksumMd5: checksum,
        uploadedByUserId: userId,
        uploadExpiresAt: uploadedAt,
        uploadedAt,
        expiresAt: new Date(uploadedAt.getTime() + 365 * 24 * 60 * 60 * 1000),
      })),
    )
    .returning();
  createdFileIds.push(...inserted.map(({ id }) => id));
  return inserted;
}

describe('File uploads and checklist photos', () => {
  it.each(['a'.repeat(64), 'a'.repeat(31), 'a'.repeat(33), 'A'.repeat(32), 'g'.repeat(32), ''])(
    'отклоняет неверный формат MD5 %s при создании и завершении',
    async (invalid) => {
      const manager = await createIdentity('manager');
      const created = await uploadPhoto(manager.cookie, { checksumMd5: invalid });
      expect(created.createResponse.statusCode).toBe(400);

      const completed = await getApp().inject({
        method: 'POST',
        url: '/file-uploads/1/completion',
        headers: { cookie: manager.cookie, 'idempotency-key': randomUUID() },
        payload: { checksumMd5: invalid },
      });
      expect(completed.statusCode).toBe(400);
    },
  );

  it('отклоняет старое поле checksumSha256 даже вместе с MD5', async () => {
    const manager = await createIdentity('manager');
    const created = await uploadPhoto(manager.cookie, { checksumSha256: 'a'.repeat(64) });
    expect(created.createResponse.statusCode).toBe(400);

    const completed = await getApp().inject({
      method: 'POST',
      url: '/file-uploads/1/completion',
      headers: { cookie: manager.cookie, 'idempotency-key': randomUUID() },
      payload: { checksumMd5: checksum, checksumSha256: 'a'.repeat(64) },
    });
    expect(completed.statusCode).toBe(400);
  });

  it.each([null, 'b'.repeat(32)])('не завершает загрузку с MD5 из HEAD %s', async (checksumMd5Hex) => {
    const manager = await createIdentity('manager');
    const created = await getApp().inject({
      method: 'POST',
      url: '/file-uploads',
      headers: { cookie: manager.cookie },
      payload: {
        purpose: 'checklist_photo',
        originalName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        checksumMd5: checksum,
      },
    });
    expect(created.statusCode).toBe(201);
    const upload = created.json<FileUpload>();
    createdFileIds.push(upload.fileId);
    const key = decodeURIComponent(new URL(upload.uploadUrl).pathname.slice(1));
    storage.objects.set(key, { sizeBytes: 1024, mimeType: 'image/jpeg', checksumMd5Hex });

    const completed = await getApp().inject({
      method: 'POST',
      url: `/file-uploads/${upload.fileId}/completion`,
      headers: { cookie: manager.cookie, 'idempotency-key': randomUUID() },
      payload: { checksumMd5: checksum },
    });

    expect(completed.statusCode).toBe(409);
    expect(completed.json()).toMatchObject({ code: 'checksum_mismatch' });
    const [file] = await getApp().db.select().from(files).where(eq(files.id, upload.fileId));
    expect(file?.status).toBe('pending');
  });

  it('выдаёт через этап только загруженные PDF в порядке документов без дублирования итогов', async () => {
    const fixture = await createFixture();
    const read = () =>
      getApp().inject({ url: `/stages/${fixture.stage.id}`, headers: { cookie: fixture.foreman.cookie } });
    const initial = await read();
    expect(initial.statusCode, initial.body).toBe(200);
    expect(initial.json<Stage>().projectDocumentFileIds).toEqual([]);
    const documentIds: number[] = [];
    for (const position of [2, 1, 3]) {
      const document = await uploadPhoto(fixture.manager.cookie, {
        purpose: 'project_document',
        originalName: `project-${position}.pdf`,
        mimeType: 'application/pdf',
      });
      expect(document.completeResponse?.statusCode, document.completeResponse?.body).toBe(200);
      documentIds.push(document.upload!.fileId);
      await getApp()
        .db.insert(projectDocuments)
        .values({ projectId: fixture.stage.projectId, fileId: document.upload!.fileId, position });
      expect((await read()).json<Stage>().projectDocumentFileIds).toHaveLength(documentIds.length);
    }
    await getApp().db.update(files).set({ status: 'pending', uploadedAt: null }).where(eq(files.id, documentIds[2]!));
    const wrongPurpose = await uploadPhoto(fixture.manager.cookie);
    expect(wrongPurpose.completeResponse?.statusCode).toBe(200);
    await getApp()
      .db.insert(projectDocuments)
      .values({ projectId: fixture.stage.projectId, fileId: wrongPurpose.upload!.fileId, position: 4 });
    const expectedIds = [documentIds[1]!, documentIds[0]!];
    const response = await read();
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json<Stage>().projectDocumentFileIds).toEqual(expectedIds);
    expect(response.json<Stage>().actualWorkAmountMinor).toBe(initial.json<Stage>().actualWorkAmountMinor);
    expect(response.json<Stage>().totalActualAmountMinor).toBe(initial.json<Stage>().totalActualAmountMinor);
    for (const fileId of expectedIds) {
      expect(
        (await getApp().inject({ url: `/files/${fileId}/content`, headers: { cookie: fixture.foreman.cookie } }))
          .statusCode,
      ).toBe(200);
    }
    for (const url of [`/stages?projectId=${fixture.stage.projectId}`, `/projects/${fixture.stage.projectId}/stages`]) {
      const listed = await getApp().inject({ url, headers: { cookie: fixture.foreman.cookie } });
      expect(listed.statusCode, listed.body).toBe(200);
      expect(listed.json().items).toHaveLength(1);
      expect(listed.json().items[0].projectDocumentFileIds).toEqual(expectedIds);
    }
    const edit = await getApp().inject({
      url: `/projects/${fixture.stage.projectId}/edit`,
      headers: { cookie: fixture.manager.cookie },
    });
    expect(edit.statusCode, edit.body).toBe(200);
    expect(edit.json().stages[0].stage.projectDocumentFileIds).toEqual(expectedIds);
    await getApp().db.delete(projectDocuments).where(eq(projectDocuments.projectId, fixture.stage.projectId));
    expect((await read()).json<Stage>().projectDocumentFileIds).toEqual([]);
  });

  it('переводит этап на приёмку, если фото ранее выполненного пункта очищены', async () => {
    const fixture = await createFixture();
    const [secondItem] = await getApp()
      .db.insert(checklistItems)
      .values({ checklistId: fixture.checklist.id, title: 'Второй пункт', position: 2 })
      .returning();
    const first = await uploadPhoto(fixture.foreman.cookie);
    await getApp().inject({
      method: 'POST',
      url: `/checklist/items/${fixture.item.id}/photos`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { fileId: first.upload!.fileId },
    });
    const done = await getApp().inject({
      method: 'PATCH',
      url: `/stages/${fixture.stage.id}/checklist/items/${fixture.item.id}`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { expectedVersion: 1, isCompleted: true },
    });
    expect(done.statusCode, done.body).toBe(200);
    await getApp()
      .db.update(files)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(files.id, first.upload!.fileId));
    await cleanupExpiredFiles(new FileRepository(getApp().db, storage, 900), getApp().log);
    const second = await uploadPhoto(fixture.foreman.cookie);
    await getApp().inject({
      method: 'POST',
      url: `/checklist/items/${secondItem!.id}/photos`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { fileId: second.upload!.fileId },
    });
    const ready = await getApp().inject({
      method: 'PATCH',
      url: `/stages/${fixture.stage.id}/checklist/items/${secondItem!.id}`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { expectedVersion: 2, isCompleted: true },
    });
    expect(ready.statusCode, ready.body).toBe(200);
    expect(ready.json<Checklist>()).toMatchObject({
      progressPercent: 100,
      items: [
        { isCompleted: true, photoCount: 0, photosDeletedByRetention: true },
        { isCompleted: true, photoCount: 1 },
      ],
    });
    const [stage] = await getApp().db.select().from(stages).where(eq(stages.id, fixture.stage.id));
    expect(stage!.status).toBe('acceptance');
  });

  it('блокирует изменения фото на приёмке и разрешает мастеру только возвращённые пункты', async () => {
    const fixture = await createFixture();
    const uploaded = await insertUploadedPhotos(fixture.foreman.user.id, 2);
    const attached = await getApp().inject({
      method: 'POST',
      url: `/checklist/items/${fixture.item.id}/photos`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { fileId: uploaded[0]!.id },
    });
    const photoId = attached.json<{ id: number }>().id;
    const add = () =>
      getApp().inject({
        method: 'POST',
        url: `/checklist/items/${fixture.item.id}/photos`,
        headers: { cookie: fixture.foreman.cookie },
        payload: { fileId: uploaded[1]!.id },
      });
    const remove = () =>
      getApp().inject({
        method: 'DELETE',
        url: `/checklist/photos/${photoId}`,
        headers: { cookie: fixture.foreman.cookie },
      });
    for (const status of ['acceptance', 'completed', 'paid'] as const) {
      await getApp().db.update(stages).set({ status }).where(eq(stages.id, fixture.stage.id));
      expect((await add()).statusCode).toBe(409);
      expect((await remove()).statusCode).toBe(409);
    }
    await getApp().db.update(stages).set({ status: 'rework' }).where(eq(stages.id, fixture.stage.id));
    expect((await add()).statusCode).toBe(403);
    expect((await remove()).statusCode).toBe(403);
    await getApp()
      .db.update(checklistItems)
      .set({ requiresRework: true })
      .where(eq(checklistItems.id, fixture.item.id));
    expect((await add()).statusCode).toBe(201);
    expect((await remove()).statusCode).toBe(204);
  });

  it('пересчитывает прогресс и обе версии при удалении последнего фото в работе', async () => {
    const fixture = await createFixture();
    const [file] = await insertUploadedPhotos(fixture.foreman.user.id, 1);
    const attached = await getApp().inject({
      method: 'POST',
      url: `/checklist/items/${fixture.item.id}/photos`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { fileId: file!.id },
    });
    await getApp()
      .db.update(checklistItems)
      .set({ isCompleted: true, completedAt: new Date(), completedByUserId: fixture.foreman.user.id })
      .where(eq(checklistItems.id, fixture.item.id));
    await getApp().db.update(stages).set({ status: 'in_progress' }).where(eq(stages.id, fixture.stage.id));
    const removed = await getApp().inject({
      method: 'DELETE',
      url: `/checklist/photos/${attached.json<{ id: number }>().id}?confirmLastPhotoDeletion=true`,
      headers: { cookie: fixture.foreman.cookie },
    });
    expect(removed.statusCode, removed.body).toBe(204);
    const checklist = await getApp().inject({
      method: 'GET',
      url: `/stages/${fixture.stage.id}/checklist`,
      headers: { cookie: fixture.foreman.cookie },
    });
    expect(checklist.json<Checklist>()).toMatchObject({
      progressPercent: 0,
      version: 2,
      items: [{ isCompleted: false, photoCount: 0, photosDeletedByRetention: false }],
    });
    const [stage] = await getApp().db.select().from(stages).where(eq(stages.id, fixture.stage.id));
    expect(stage).toMatchObject({ status: 'in_progress', version: 2 });
  });

  it('повторяет привязку без дубля и аудита, сохраняет фото до отдельного выполнения', async () => {
    const fixture = await createFixture();
    const uploaded = await uploadPhoto(fixture.foreman.cookie);
    const attach = () =>
      getApp().inject({
        method: 'POST',
        url: `/checklist/items/${fixture.item.id}/photos`,
        headers: { cookie: fixture.foreman.cookie },
        payload: { fileId: uploaded.upload!.fileId },
      });
    const responses = await Promise.all([attach(), attach()]);
    expect(responses.map((response) => response.statusCode)).toEqual([201, 201]);
    expect(responses[0]!.json()).toEqual(responses[1]!.json());
    const checklist = await getApp().inject({
      method: 'GET',
      url: `/stages/${fixture.stage.id}/checklist`,
      headers: { cookie: fixture.foreman.cookie },
    });
    expect(checklist.json<Checklist>()).toMatchObject({
      progressPercent: 0,
      version: 1,
      items: [{ isCompleted: false, photoCount: 1, photosDeletedByRetention: false, reworkComment: null }],
    });
    expect((await auditRecords(getApp().db, fixture.foreman.user.id, 'createChecklistItemPhoto')).events).toHaveLength(
      1,
    );
  });

  it('сохраняет выполнение после очистки, принимает этап и требует новое фото при доработке', async () => {
    const fixture = await createFixture();
    const uploaded = await uploadPhoto(fixture.foreman.cookie);
    const attached = await getApp().inject({
      method: 'POST',
      url: `/checklist/items/${fixture.item.id}/photos`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { fileId: uploaded.upload!.fileId },
    });
    expect(attached.statusCode).toBe(201);
    const done = await getApp().inject({
      method: 'PATCH',
      url: `/stages/${fixture.stage.id}/checklist/items/${fixture.item.id}`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { expectedVersion: 1, isCompleted: true },
    });
    expect(done.statusCode, done.body).toBe(200);
    const ready = done.json<Checklist>();
    expect(ready.progressPercent).toBe(100);
    await getApp()
      .db.update(files)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(files.id, uploaded.upload!.fileId));
    await cleanupExpiredFiles(new FileRepository(getApp().db, storage, 900), getApp().log);
    const read = await getApp().inject({
      method: 'GET',
      url: `/stages/${fixture.stage.id}/checklist`,
      headers: { cookie: fixture.foreman.cookie },
    });
    expect(read.json<Checklist>()).toMatchObject({
      progressPercent: 100,
      version: ready.version,
      items: [{ isCompleted: true, photoCount: 0, photosDeletedByRetention: true }],
    });
    expect(storage.objects.has(uploaded.key!)).toBe(false);
    const [stage] = await getApp().db.select().from(stages).where(eq(stages.id, fixture.stage.id));
    expect(stage!.status).toBe('acceptance');
    const rejected = await getApp().inject({
      method: 'POST',
      url: `/stages/${stage!.id}/rework`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: stage!.version, items: [{ itemId: fixture.item.id, comment: 'Нужно исправить' }] },
    });
    expect(rejected.statusCode, rejected.body).toBe(200);
    const retry = await getApp().inject({
      method: 'PATCH',
      url: `/stages/${stage!.id}/checklist/items/${fixture.item.id}`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { expectedVersion: ready.version + 1, isCompleted: true },
    });
    expect(retry.statusCode).toBe(409);
    expect(retry.json()).toMatchObject({ code: 'invalid_transition' });
    const fresh = await uploadPhoto(fixture.foreman.cookie);
    const freshAttached = await getApp().inject({
      method: 'POST',
      url: `/checklist/items/${fixture.item.id}/photos`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { fileId: fresh.upload!.fileId },
    });
    expect(freshAttached.statusCode, freshAttached.body).toBe(201);
    const fixed = await getApp().inject({
      method: 'PATCH',
      url: `/stages/${stage!.id}/checklist/items/${fixture.item.id}`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { expectedVersion: ready.version + 1, isCompleted: true },
    });
    expect(fixed.statusCode, fixed.body).toBe(200);
    await getApp()
      .db.update(files)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(files.id, fresh.upload!.fileId));
    await cleanupExpiredFiles(new FileRepository(getApp().db, storage, 900), getApp().log);
    const [readyAgain] = await getApp().db.select().from(stages).where(eq(stages.id, stage!.id));
    const accepted = await getApp().inject({
      method: 'POST',
      url: `/stages/${stage!.id}/acceptance`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: readyAgain!.version },
    });
    expect(accepted.statusCode, accepted.body).toBe(200);
    expect(accepted.json<Stage>()).toMatchObject({ status: 'completed', progressPercent: 100 });
  });

  it('не открывает чужую upload-сессию и запрещает операции после истечения авторизации', async () => {
    const fixture = await createFixture();
    const other = await createIdentity('foreman');
    const uploaded = await uploadPhoto(fixture.foreman.cookie);
    const foreignCompletion = await getApp().inject({
      method: 'POST',
      url: `/file-uploads/${uploaded.upload!.fileId}/completion`,
      headers: { cookie: other.cookie, 'idempotency-key': randomUUID() },
      payload: { checksumMd5: checksum },
    });
    expect(foreignCompletion.statusCode).toBe(404);
    const foreignAttach = await getApp().inject({
      method: 'POST',
      url: `/checklist/items/${fixture.item.id}/photos`,
      headers: { cookie: other.cookie },
      payload: { fileId: uploaded.upload!.fileId },
    });
    expect(foreignAttach.statusCode).toBe(404);
    await getApp()
      .db.update(sessions)
      .set({ createdAt: new Date(Date.now() - 2000), expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.userId, fixture.foreman.user.id));
    for (const request of [
      {
        method: 'POST' as const,
        url: `/file-uploads/${uploaded.upload!.fileId}/completion`,
        payload: { checksumMd5: checksum },
      },
      {
        method: 'POST' as const,
        url: `/checklist/items/${fixture.item.id}/photos`,
        payload: { fileId: uploaded.upload!.fileId },
      },
      { method: 'GET' as const, url: `/files/${uploaded.upload!.fileId}/content` },
    ]) {
      const response = await getApp().inject({
        ...request,
        headers: { cookie: fixture.foreman.cookie, 'idempotency-key': randomUUID() },
      });
      expect(response.statusCode, response.body).toBe(401);
    }
  });

  it('отзывает вложенные ресурсы у прежнего мастера после замены, открывает PDF назначенному мастеру', async () => {
    const fixture = await createFixture();
    const replacement = await createIdentity('foreman');
    const photo = await uploadPhoto(fixture.foreman.cookie);
    const document = await uploadPhoto(fixture.manager.cookie, {
      purpose: 'project_document',
      originalName: 'project.pdf',
      mimeType: 'application/pdf',
    });
    const invoiceFile = await uploadPhoto(fixture.manager.cookie, {
      purpose: 'material_invoice',
      originalName: 'invoice.pdf',
      mimeType: 'application/pdf',
    });
    for (const uploaded of [photo, document, invoiceFile]) expect(uploaded.completeResponse?.statusCode).toBe(200);
    const attached = await getApp().inject({
      method: 'POST',
      url: `/checklist/items/${fixture.item.id}/photos`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { fileId: photo.upload!.fileId },
    });
    expect(attached.statusCode, attached.body).toBe(201);
    await getApp()
      .db.insert(projectDocuments)
      .values({ projectId: fixture.stage.projectId, fileId: document.upload!.fileId, position: 1 });
    const invoice = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/material-invoices`,
      headers: { cookie: fixture.manager.cookie },
      payload: { fileId: invoiceFile.upload!.fileId, amountMinor: 10_000, supplierName: 'Поставщик' },
    });
    expect(invoice.statusCode, invoice.body).toBe(201);
    const payment = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
      payload: { paidAt: '2026-10-04', amountMinor: 5000 },
    });
    expect(payment.statusCode, payment.body).toBe(201);
    const download = (cookie: string, fileId: number) =>
      getApp().inject({ url: `/files/${fileId}/content`, headers: { cookie } });
    expect((await download(fixture.foreman.cookie, document.upload!.fileId)).statusCode).toBe(200);
    const context = await getApp().inject({
      url: `/stages/${fixture.stage.id}`,
      headers: { cookie: fixture.foreman.cookie },
    });
    expect(context.json<Stage>().projectDocumentFileIds).toEqual([document.upload!.fileId]);
    expect((await download(replacement.cookie, document.upload!.fileId)).statusCode).toBe(404);
    await getApp()
      .db.update(stages)
      .set({ status: 'in_progress', actualStartDate: '2026-10-04' })
      .where(eq(stages.id, fixture.stage.id));
    const changed = await getApp().inject({
      method: 'PATCH',
      url: `/stages/${fixture.stage.id}`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: 1, assigneeId: replacement.user.id, notes: 'Новый мастер' },
    });
    expect(changed.statusCode, changed.body).toBe(200);
    for (const url of [
      `/stages/${fixture.stage.id}`,
      `/stages/${fixture.stage.id}/checklist`,
      `/stages/${fixture.stage.id}/material-invoices`,
      `/checklist/items/${fixture.item.id}/photos`,
    ]) {
      expect((await getApp().inject({ url, headers: { cookie: fixture.foreman.cookie } })).statusCode).toBe(404);
      expect((await getApp().inject({ url, headers: { cookie: replacement.cookie } })).statusCode).toBe(200);
    }
    for (const uploaded of [photo, document, invoiceFile]) {
      expect((await download(fixture.foreman.cookie, uploaded.upload!.fileId)).statusCode).toBe(404);
      expect((await download(replacement.cookie, uploaded.upload!.fileId)).statusCode).toBe(200);
    }
    const oldList = await getApp().inject({
      url: `/stages?projectId=${fixture.stage.projectId}`,
      headers: { cookie: fixture.foreman.cookie },
    });
    expect(oldList.json()).toMatchObject({ total: 0, items: [] });
    for (const [cookie, statusCode] of [
      [fixture.foreman.cookie, 404],
      [replacement.cookie, 200],
    ] as const) {
      expect(
        (await getApp().inject({ url: `/stages/${fixture.stage.id}/work-payments`, headers: { cookie } })).statusCode,
      ).toBe(statusCode);
      expect(
        (
          await getApp().inject({
            method: 'PATCH',
            url: `/work-payments/${payment.json().id}`,
            headers: { cookie },
            payload: { expectedVersion: 1, amountMinor: 9000 },
          })
        ).statusCode,
      ).toBe(403);
    }
    const payments = await getApp().inject({
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
    });
    expect(payments.json()).toMatchObject([{ id: payment.json().id, amountMinor: 5000 }]);
    await getApp().db.insert(stages).values({
      projectId: fixture.stage.projectId,
      stageTypeCode: 'roof',
      position: 3,
      assigneeId: fixture.foreman.user.id,
    });
    expect((await download(fixture.foreman.cookie, document.upload!.fileId)).statusCode).toBe(200);
    expect(
      (await getApp().inject({ url: `/stages/${fixture.stage.id}`, headers: { cookie: fixture.foreman.cookie } }))
        .statusCode,
    ).toBe(404);
  });

  it('повторяет создание после сетевой ошибки и идемпотентно завершает upload', async () => {
    const manager = await createIdentity('manager');
    storage.failNextUploadRequest = true;
    const failed = await uploadPhoto(manager.cookie);
    expect(failed.createResponse.statusCode).toBe(500);

    const uploaded = await uploadPhoto(manager.cookie);
    expect(uploaded.completeResponse?.statusCode, uploaded.completeResponse?.body).toBe(200);
    const idempotencyKey = randomUUID();
    const first = await getApp().inject({
      method: 'POST',
      url: `/file-uploads/${uploaded.upload!.fileId}/completion`,
      headers: { cookie: manager.cookie, 'idempotency-key': idempotencyKey },
      payload: { checksumMd5: checksum },
    });
    expect(first.statusCode).toBe(409);
    const stored = await getApp().db.select().from(files).where(eq(files.id, uploaded.upload!.fileId));
    expect(stored).toHaveLength(1);
  });

  it('возвращает тот же файл при повторе completion с тем же ключом', async () => {
    const manager = await createIdentity('manager');
    const createResponse = await getApp().inject({
      method: 'POST',
      url: '/file-uploads',
      headers: { cookie: manager.cookie },
      payload: {
        purpose: 'checklist_photo',
        originalName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        checksumMd5: checksum,
      },
    });
    const upload = createResponse.json<FileUpload>();
    createdFileIds.push(upload.fileId);
    const key = decodeURIComponent(new URL(upload.uploadUrl).pathname.slice(1));
    storage.objects.set(key, {
      sizeBytes: 1024,
      mimeType: 'image/jpeg',
      checksumMd5Hex: checksum,
    });
    const idempotencyKey = randomUUID();
    const complete = () =>
      getApp().inject({
        method: 'POST',
        url: `/file-uploads/${upload.fileId}/completion`,
        headers: { cookie: manager.cookie, 'idempotency-key': idempotencyKey },
        payload: { checksumMd5: checksum },
      });
    const first = await complete();
    const second = await complete();
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());

    const audit = await auditRecords(getApp().db, manager.user.id, 'completeFileUpload');
    expect(audit.events).toHaveLength(1);
    expect(audit.changes).toHaveLength(1);
    expect(audit.changes[0]).toMatchObject({
      entityType: 'files',
      entityKey: { id: upload.fileId },
      before: { status: 'pending' },
      after: { status: 'uploaded' },
    });
    expect(JSON.stringify(audit.changes)).not.toContain(idempotencyKey);
    expect(JSON.stringify(audit.changes)).not.toContain(key);
  });

  it('отклоняет неверный MIME, размер и checksum', async () => {
    const manager = await createIdentity('manager');
    const mime = await uploadPhoto(manager.cookie, { mimeType: 'text/plain' });
    expect(mime.createResponse.statusCode).toBe(400);
    const size = await uploadPhoto(manager.cookie, { sizeBytes: 20_000_000 + 1 });
    expect(size.createResponse.statusCode).toBe(413);

    const uploaded = await uploadPhoto(manager.cookie);
    expect(uploaded.completeResponse?.statusCode).toBe(200);
    const mismatch = await getApp().inject({
      method: 'POST',
      url: `/file-uploads/${uploaded.upload!.fileId}/completion`,
      headers: { cookie: manager.cookie, 'idempotency-key': randomUUID() },
      payload: { checksumMd5: 'b'.repeat(32) },
    });
    expect(mismatch.statusCode).toBe(409);
  });

  it.each([
    {
      purpose: 'project_document',
      sizeBytes: 50_000_000,
      mimeType: 'application/pdf',
      originalName: 'project.pdf',
      status: 400,
    },
    {
      purpose: 'material_invoice',
      sizeBytes: 10_000_000,
      mimeType: 'application/pdf',
      originalName: 'invoice.pdf',
      status: 413,
    },
    {
      purpose: 'checklist_photo',
      sizeBytes: 20_000_000,
      mimeType: 'image/jpeg',
      originalName: 'photo.jpg',
      status: 413,
    },
  ])('проверяет десятичную границу $purpose при создании и завершении загрузки', async ({ status, ...input }) => {
    const manager = await createIdentity('manager');
    const boundary = await uploadPhoto(manager.cookie, input);
    expect(boundary.createResponse.statusCode, boundary.createResponse.body).toBe(201);
    expect(boundary.completeResponse?.statusCode, boundary.completeResponse?.body).toBe(200);

    const oversized = await uploadPhoto(manager.cookie, { ...input, sizeBytes: input.sizeBytes + 1 });
    expect(oversized.createResponse.statusCode).toBe(status);

    const createResponse = await getApp().inject({
      method: 'POST',
      url: '/file-uploads',
      headers: { cookie: manager.cookie },
      payload: { ...input, checksumMd5: checksum },
    });
    expect(createResponse.statusCode, createResponse.body).toBe(201);
    const upload = createResponse.json<FileUpload>();
    createdFileIds.push(upload.fileId);
    const key = decodeURIComponent(new URL(upload.uploadUrl).pathname.slice(1));
    storage.objects.set(key, {
      sizeBytes: input.sizeBytes + 1,
      mimeType: input.mimeType,
      checksumMd5Hex: Buffer.from(upload.headers['content-md5']!, 'base64').toString('hex'),
    });
    const completed = await getApp().inject({
      method: 'POST',
      url: `/file-uploads/${upload.fileId}/completion`,
      headers: { cookie: manager.cookie, 'idempotency-key': randomUUID() },
      payload: { checksumMd5: checksum },
    });
    expect(completed.statusCode).toBe(413);
    expect(completed.json()).toMatchObject({ code: 'file_too_large' });
  });

  it.each([
    { sizeBytes: 20_000_000, status: 201 },
    { sizeBytes: 20_000_001, status: 404 },
  ])('проверяет размер $sizeBytes при привязке загруженного фото', async ({ sizeBytes, status }) => {
    const fixture = await createFixture();
    const [file] = await insertUploadedPhotos(fixture.foreman.user.id, 1);
    await getApp().db.update(files).set({ sizeBytes }).where(eq(files.id, file!.id));
    const response = await getApp().inject({
      method: 'POST',
      url: `/checklist/items/${fixture.item.id}/photos`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { fileId: file!.id },
    });
    expect(response.statusCode, response.body).toBe(status);
  });

  it('не раскрывает чужой файл по прямому ID', async () => {
    const fixture = await createFixture();
    const owner = await createIdentity('foreman');
    const uploaded = await uploadPhoto(owner.cookie);
    const attached = await getApp().inject({
      method: 'POST',
      url: `/checklist/items/${fixture.item.id}/photos`,
      headers: { cookie: fixture.manager.cookie },
      payload: { fileId: uploaded.upload!.fileId },
    });
    expect(attached.statusCode, attached.body).toBe(201);
    const response = await getApp().inject({
      method: 'GET',
      url: `/files/${uploaded.upload!.fileId}/content`,
      headers: { cookie: owner.cookie },
    });
    expect(response.statusCode).toBe(404);
  });

  it('привязывает максимум двадцать фотографий конкурентно и не выполняет пункт', async () => {
    const fixture = await createFixture();
    const uploaded = await insertUploadedPhotos(fixture.foreman.user.id, 21);
    const responses = await Promise.all(
      uploaded.map((file) =>
        getApp().inject({
          method: 'POST',
          url: `/checklist/items/${fixture.item.id}/photos`,
          headers: { cookie: fixture.foreman.cookie },
          payload: { fileId: file.id },
        }),
      ),
    );
    expect(responses.filter(({ statusCode }) => statusCode === 201)).toHaveLength(20);
    expect(responses.filter(({ statusCode }) => statusCode === 409)).toHaveLength(1);
    const [storedItem] = await getApp().db.select().from(checklistItems).where(eq(checklistItems.id, fixture.item.id));
    expect(storedItem?.isCompleted).toBe(false);
  });

  it('удаляет последнее фото и атомарно снимает отметку пункта', async () => {
    const fixture = await createFixture();
    const [file] = await insertUploadedPhotos(fixture.foreman.user.id, 1);
    const attached = await getApp().inject({
      method: 'POST',
      url: `/checklist/items/${fixture.item.id}/photos`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { fileId: file!.id },
    });
    await getApp()
      .db.update(checklistItems)
      .set({ isCompleted: true, completedAt: new Date(), completedByUserId: fixture.foreman.user.id })
      .where(eq(checklistItems.id, fixture.item.id));
    await getApp().db.update(stages).set({ status: 'acceptance' }).where(eq(stages.id, fixture.stage.id));
    const blocked = await getApp().inject({
      method: 'DELETE',
      url: `/checklist/photos/${attached.json<{ id: number }>().id}`,
      headers: { cookie: fixture.foreman.cookie },
    });
    expect(blocked.statusCode).toBe(409);
    const unconfirmed = await getApp().inject({
      method: 'DELETE',
      url: `/checklist/photos/${attached.json<{ id: number }>().id}`,
      headers: { cookie: fixture.manager.cookie },
    });
    expect(unconfirmed.statusCode).toBe(409);
    expect(unconfirmed.json()).toMatchObject({ code: 'photo_deletion_confirmation_required' });
    const response = await getApp().inject({
      method: 'DELETE',
      url: `/checklist/photos/${attached.json<{ id: number }>().id}?confirmLastPhotoDeletion=true`,
      headers: { cookie: fixture.manager.cookie },
    });
    expect(response.statusCode, response.body).toBe(204);
    const [storedItem] = await getApp().db.select().from(checklistItems).where(eq(checklistItems.id, fixture.item.id));
    const [activePhoto] = await getApp()
      .db.select()
      .from(checklistItemPhotos)
      .where(and(eq(checklistItemPhotos.checklistItemId, fixture.item.id), isNull(checklistItemPhotos.deletedAt)));
    expect(storedItem?.isCompleted).toBe(false);
    expect(activePhoto).toBeUndefined();
    const audit = await auditRecords(getApp().db, fixture.manager.user.id, 'deleteChecklistItemPhoto');
    expect(audit.events).toHaveLength(1);
    expect(audit.changes.map((change) => change.entityType).sort()).toEqual([
      'checklist_item_photos',
      'checklist_items',
      'checklists',
      'files',
      'stages',
    ]);
    expect(audit.changes.every((change) => change.stageId === fixture.stage.id)).toBe(true);
    expect(audit.changes.find((change) => change.entityType === 'checklist_items')).toMatchObject({
      before: { isCompleted: true },
      after: { isCompleted: false, completedAt: null, completedByUserId: null },
    });
    expect(audit.changes.find((change) => change.entityType === 'stages')).toMatchObject({
      before: { status: 'acceptance' },
      after: { status: 'in_progress' },
    });
  });

  it('повторяет временно неудачное удаление просроченного фото', async () => {
    const fixture = await createFixture();
    const [file] = await insertUploadedPhotos(fixture.foreman.user.id, 1);
    await getApp()
      .db.update(files)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(files.id, file!.id));
    await getApp()
      .db.insert(checklistItemPhotos)
      .values({ checklistItemId: fixture.item.id, fileId: file!.id, position: 1 });
    storage.objects.set(file!.storageKey, {
      sizeBytes: file!.sizeBytes,
      mimeType: file!.mimeType,
      checksumMd5Hex: file!.checksumMd5,
    });
    const repository = new FileRepository(getApp().db, storage, 900);
    storage.failNextDelete = true;
    await cleanupExpiredFiles(repository, getApp().log);
    const [afterFailure] = await getApp().db.select().from(files).where(eq(files.id, file!.id));
    expect(afterFailure?.status).toBe('uploaded');
    const failedAudit = await auditRecords(getApp().db, null, 'cleanupExpiredFile');
    expect(
      failedAudit.changes.filter((change) => change.entityType === 'files' && change.entityKey.id === file!.id),
    ).toHaveLength(0);
    await cleanupExpiredFiles(repository, getApp().log);
    const [deleted] = await getApp().db.select().from(files).where(eq(files.id, file!.id));
    const [photo] = await getApp()
      .db.select()
      .from(checklistItemPhotos)
      .where(eq(checklistItemPhotos.fileId, file!.id));
    expect(deleted?.status).toBe('deleted');
    expect(photo?.deletedAt).toBeInstanceOf(Date);
    expect(photo?.deletedByRetention).toBe(true);
    expect(storage.objects.has(file!.storageKey)).toBe(false);
    await cleanupExpiredFiles(repository, getApp().log);
    const audit = await auditRecords(getApp().db, null, 'cleanupExpiredFile');
    const fileChanges = audit.changes.filter(
      (change) => change.entityType === 'files' && change.entityKey.id === file!.id,
    );
    expect(fileChanges).toHaveLength(1);
    const event = audit.events.find((entry) => entry.id === fileChanges[0]!.eventId);
    expect(event).toMatchObject({ source: 'system', actorUserId: null, actorSnapshot: null });
    expect(
      audit.changes
        .filter((change) => change.eventId === event!.id)
        .map((change) => change.entityType)
        .sort(),
    ).toEqual(['checklist_item_photos', 'files']);
  });
});
