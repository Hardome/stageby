import { randomUUID } from 'node:crypto';

import fastifyCookie from '@fastify/cookie';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { parseEnvironment } from '#app/config/env';
import { checklistItems, checklists } from '#app/db/schema/checklists';
import { checklistItemPhotos, files } from '#app/db/schema/files';
import { projects } from '#app/db/schema/projects';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import type { FileUpload, Project } from '#app/generated/types.gen';
import { hashPassword } from '#app/modules/auth/password-hasher';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { cleanupExpiredFiles } from '#app/modules/files/cleanup';
import { fileModule } from '#app/modules/files/index';
import { FileRepository } from '#app/modules/files/repository';
import { projectModule } from '#app/modules/projects/index';
import { stageModule } from '#app/modules/stages/index';
import { UserRepository } from '#app/modules/users/repository';
import { registerAuthentication } from '#app/plugins/authentication';
import { registerErrorHandler } from '#app/plugins/error-handler';
import type {
  FileStorage,
  SignedStorageRequest,
  SignedUploadRequest,
  StoredObjectMetadata,
} from '#app/storage/file-storage';
import { setupModuleTest } from '#test/setup-module-test';

const PASSWORD = 'Files-test-password-123!';
const checksum = 'a'.repeat(64);
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
    checksumSha256Base64: string;
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
        'x-amz-checksum-sha256': input.checksumSha256Base64,
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
    headers: { cookie: manager.cookie },
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
          canRunInParallel: false,
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
      checksumSha256: checksum,
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
    checksumSha256Base64: upload.headers['x-amz-checksum-sha256']!,
  });
  const completeResponse = await getApp().inject({
    method: 'POST',
    url: `/file-uploads/${upload.fileId}/completion`,
    headers: { cookie, 'idempotency-key': randomUUID() },
    payload: { checksumSha256: checksum },
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
        checksumSha256: checksum,
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
      payload: { checksumSha256: checksum },
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
        checksumSha256: checksum,
      },
    });
    const upload = createResponse.json<FileUpload>();
    createdFileIds.push(upload.fileId);
    const key = decodeURIComponent(new URL(upload.uploadUrl).pathname.slice(1));
    storage.objects.set(key, {
      sizeBytes: 1024,
      mimeType: 'image/jpeg',
      checksumSha256Base64: Buffer.from(checksum, 'hex').toString('base64'),
    });
    const idempotencyKey = randomUUID();
    const complete = () =>
      getApp().inject({
        method: 'POST',
        url: `/file-uploads/${upload.fileId}/completion`,
        headers: { cookie: manager.cookie, 'idempotency-key': idempotencyKey },
        payload: { checksumSha256: checksum },
      });
    const first = await complete();
    const second = await complete();
    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());
  });

  it('отклоняет неверный MIME, размер и checksum', async () => {
    const manager = await createIdentity('manager');
    const mime = await uploadPhoto(manager.cookie, { mimeType: 'text/plain' });
    expect(mime.createResponse.statusCode).toBe(400);
    const size = await uploadPhoto(manager.cookie, { sizeBytes: 20 * 1024 * 1024 + 1 });
    expect(size.createResponse.statusCode).toBe(413);

    const uploaded = await uploadPhoto(manager.cookie);
    expect(uploaded.completeResponse?.statusCode).toBe(200);
    const mismatch = await getApp().inject({
      method: 'POST',
      url: `/file-uploads/${uploaded.upload!.fileId}/completion`,
      headers: { cookie: manager.cookie, 'idempotency-key': randomUUID() },
      payload: { checksumSha256: 'b'.repeat(64) },
    });
    expect(mismatch.statusCode).toBe(409);
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
    const response = await getApp().inject({
      method: 'DELETE',
      url: `/checklist/photos/${attached.json<{ id: number }>().id}`,
      headers: { cookie: fixture.foreman.cookie },
    });
    expect(response.statusCode, response.body).toBe(204);
    const [storedItem] = await getApp().db.select().from(checklistItems).where(eq(checklistItems.id, fixture.item.id));
    const [activePhoto] = await getApp()
      .db.select()
      .from(checklistItemPhotos)
      .where(and(eq(checklistItemPhotos.checklistItemId, fixture.item.id), isNull(checklistItemPhotos.deletedAt)));
    expect(storedItem?.isCompleted).toBe(false);
    expect(activePhoto).toBeUndefined();
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
      checksumSha256Base64: Buffer.from(file!.checksumSha256, 'hex').toString('base64'),
    });
    const repository = new FileRepository(getApp().db, storage, 900);
    storage.failNextDelete = true;
    await cleanupExpiredFiles(repository, getApp().log);
    const [afterFailure] = await getApp().db.select().from(files).where(eq(files.id, file!.id));
    expect(afterFailure?.status).toBe('uploaded');
    await cleanupExpiredFiles(repository, getApp().log);
    const [deleted] = await getApp().db.select().from(files).where(eq(files.id, file!.id));
    const [photo] = await getApp()
      .db.select()
      .from(checklistItemPhotos)
      .where(eq(checklistItemPhotos.fileId, file!.id));
    expect(deleted?.status).toBe('deleted');
    expect(photo?.deletedAt).toBeInstanceOf(Date);
    expect(storage.objects.has(file!.storageKey)).toBe(false);
  });
});
