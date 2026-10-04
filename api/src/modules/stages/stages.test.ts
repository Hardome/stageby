import { randomUUID } from 'node:crypto';

import fastifyCookie from '@fastify/cookie';
import { eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { parseEnvironment } from '#app/config/env';
import { checklistItems, checklists } from '#app/db/schema/checklists';
import { checklistItemPhotos, files } from '#app/db/schema/files';
import { materialInvoices } from '#app/db/schema/materials';
import { projects } from '#app/db/schema/projects';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import { workPayments } from '#app/db/schema/work-payments';
import type { Checklist, Project, Stage } from '#app/generated/types.gen';
import { hashPassword } from '#app/modules/auth/password-hasher';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { projectModule } from '#app/modules/projects/index';
import { stageModule } from '#app/modules/stages/index';
import { UserRepository } from '#app/modules/users/repository';
import { registerAuthentication } from '#app/plugins/authentication';
import { registerErrorHandler } from '#app/plugins/error-handler';
import { auditRecords } from '#test/audit-records';
import { setupModuleTest } from '#test/setup-module-test';

const PASSWORD = 'Stages-test-password-123!';
const createdUserIds: number[] = [];
const createdProjectIds: number[] = [];
const createdFileIds: number[] = [];
let passwordHash: string;

const stagesTestModule: FastifyPluginAsync = async (app) => {
  const environment = parseEnvironment({
    NODE_ENV: 'test',
    DATABASE_URL: process.env.DATABASE_URL,
    CORS_ORIGIN: 'http://localhost:5173',
    LOG_LEVEL: 'silent',
  });
  registerErrorHandler(app, environment);
  await app.register(fastifyCookie);
  await registerAuthentication(app);
  await app.register(projectModule);
  await app.register(stageModule);
};

const getApp = setupModuleTest(stagesTestModule);

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
});

async function createIdentity(role: 'manager' | 'foreman') {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 20);
  const user = await new UserRepository(getApp().db).create({
    login: `stages.${suffix}`,
    passwordHash,
    fullName: `Пользователь ${suffix}`,
    role,
  });
  createdUserIds.push(user.id);
  const issued = await new SessionService(new SessionRepository(getApp().db), 12).issue(user.id);
  return { user, cookie: `stageby_session=${issued.accessToken}` };
}

async function createFixture(
  options: { assigned?: boolean; itemCount?: number; plannedWorkAmountMinor?: number } = {},
) {
  const manager = await createIdentity('manager');
  const foreman = await createIdentity('foreman');
  const itemCount = options.itemCount ?? 2;
  const response = await getApp().inject({
    method: 'POST',
    url: '/projects',
    headers: { cookie: manager.cookie },
    payload: {
      ownerName: `Клиент ${randomUUID()}`,
      address: 'Екатеринбург, ул. Тестовая, 1',
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
          assigneeId: options.assigned === false ? null : foreman.user.id,
          plannedWorkAmountMinor: options.plannedWorkAmountMinor ?? 10_000,
          plannedMaterialAmountMinor: null,
          checklistItems: Array.from({ length: itemCount }, (_, index) => ({ title: `Пункт ${index + 1}` })),
        },
      ],
    },
  });
  if (response.statusCode !== 201) throw new Error(`Не удалось создать тестовый проект: ${response.body}`);
  const project = response.json<Project>();
  createdProjectIds.push(project.id);
  const [stage] = await getApp().db.select().from(stages).where(eq(stages.projectId, project.id));
  const [checklist] = await getApp().db.select().from(checklists).where(eq(checklists.stageId, stage!.id));
  const items = await getApp().db.select().from(checklistItems).where(eq(checklistItems.checklistId, checklist!.id));
  return { manager, foreman, project, stage: stage!, checklist: checklist!, items };
}

async function attachUploadedPhoto(itemId: number) {
  const uploadedAt = new Date();
  const [file] = await getApp()
    .db.insert(files)
    .values({
      status: 'uploaded',
      purpose: 'checklist_photo',
      storageKey: `tests/stages/${randomUUID()}`,
      originalName: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      checksumSha256: '0'.repeat(64),
      uploadedByUserId: createdUserIds[0]!,
      uploadExpiresAt: uploadedAt,
      uploadedAt,
      expiresAt: new Date(uploadedAt.getTime() + 365 * 24 * 60 * 60 * 1000),
    })
    .returning();
  createdFileIds.push(file!.id);
  await getApp().db.insert(checklistItemPhotos).values({ checklistItemId: itemId, fileId: file!.id, position: 1 });
}

async function createUploadedMaterialFile() {
  const uploadedAt = new Date();
  const [file] = await getApp()
    .db.insert(files)
    .values({
      status: 'uploaded',
      purpose: 'material_invoice',
      storageKey: `tests/stages/materials/${randomUUID()}`,
      originalName: 'invoice.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      checksumSha256: '1'.repeat(64),
      uploadedByUserId: createdUserIds[0]!,
      uploadExpiresAt: uploadedAt,
      uploadedAt,
    })
    .returning();
  createdFileIds.push(file!.id);
  return file!;
}

async function updateItem(
  cookie: string,
  stageId: number,
  itemId: number,
  expectedVersion: number,
  isCompleted = true,
) {
  return getApp().inject({
    method: 'PATCH',
    url: `/stages/${stageId}/checklist/items/${itemId}`,
    headers: { cookie },
    payload: { expectedVersion, isCompleted },
  });
}

describe('Stage statuses and checklists', () => {
  it('назначает только активного мастера и переводит created в assigned', async () => {
    const fixture = await createFixture({ assigned: false });
    const before = await getApp().inject({
      method: 'GET',
      url: `/stages/${fixture.stage.id}/checklist`,
      headers: { cookie: fixture.foreman.cookie },
    });
    expect(before.statusCode).toBe(404);

    const response = await getApp().inject({
      method: 'PATCH',
      url: `/stages/${fixture.stage.id}`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: 1, assigneeId: fixture.foreman.user.id },
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json<Stage>()).toMatchObject({ status: 'assigned', assignee: { id: fixture.foreman.user.id } });
  });

  it('требует фото, начинает неукомплектованный этап и автоматически переводит последний пункт в acceptance', async () => {
    const fixture = await createFixture();
    const withoutPhoto = await updateItem(fixture.foreman.cookie, fixture.stage.id, fixture.items[0]!.id, 1);
    expect(withoutPhoto.statusCode).toBe(409);

    await attachUploadedPhoto(fixture.items[0]!.id);
    await attachUploadedPhoto(fixture.items[1]!.id);
    const first = await updateItem(fixture.foreman.cookie, fixture.stage.id, fixture.items[0]!.id, 1);
    expect(first.statusCode, first.body).toBe(200);
    const firstChecklist = first.json<Checklist>();
    expect(firstChecklist.progressPercent).toBe(50);
    expect(firstChecklist.warnings).toEqual(['materials_incomplete']);
    expect(firstChecklist.items[0]).toMatchObject({ isCompleted: true, completedBy: { id: fixture.foreman.user.id } });
    expect(firstChecklist.items[0]!.completedAt).not.toBeNull();
    const [started] = await getApp().db.select().from(stages).where(eq(stages.id, fixture.stage.id));
    expect(started).toMatchObject({ status: 'in_progress' });
    expect(started!.actualStartDate).not.toBeNull();

    const last = await updateItem(fixture.foreman.cookie, fixture.stage.id, fixture.items[1]!.id, 2);
    expect(last.statusCode, last.body).toBe(200);
    expect(last.json<Checklist>().progressPercent).toBe(100);
    const [acceptance] = await getApp().db.select().from(stages).where(eq(stages.id, fixture.stage.id));
    expect(acceptance!.status).toBe('acceptance');
  });

  it('очищает автора и время при снятии отметки', async () => {
    const fixture = await createFixture();
    await attachUploadedPhoto(fixture.items[0]!.id);
    const completed = await updateItem(fixture.foreman.cookie, fixture.stage.id, fixture.items[0]!.id, 1);
    const cleared = await updateItem(
      fixture.foreman.cookie,
      fixture.stage.id,
      fixture.items[0]!.id,
      completed.json<Checklist>().version,
      false,
    );
    expect(cleared.statusCode, cleared.body).toBe(200);
    expect(cleared.json<Checklist>().items[0]).toMatchObject({
      isCompleted: false,
      completedAt: null,
      completedBy: null,
    });
  });

  it('разрешает supplied только после доставки всех счетов всех заказов', async () => {
    const fixture = await createFixture();
    const missing = await getApp().inject({
      method: 'PUT',
      url: `/stages/${fixture.stage.id}/status`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: 1, status: 'supplied' },
    });
    expect(missing.statusCode).toBe(409);
    const file = await createUploadedMaterialFile();
    await getApp().db.insert(materialInvoices).values({
      stageId: fixture.stage.id,
      fileId: file.id,
      amountMinor: 10_000,
      deliveredAt: new Date(),
      deliveredByUserId: fixture.manager.user.id,
    });
    const supplied = await getApp().inject({
      method: 'PUT',
      url: `/stages/${fixture.stage.id}/status`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: 1, status: 'supplied' },
    });
    expect(supplied.statusCode, supplied.body).toBe(200);
    expect(supplied.json<Stage>().status).toBe('supplied');

    await attachUploadedPhoto(fixture.items[0]!.id);
    const started = await updateItem(fixture.foreman.cookie, fixture.stage.id, fixture.items[0]!.id, 1);
    expect(started.statusCode, started.body).toBe(200);
    const [inProgress] = await getApp().db.select().from(stages).where(eq(stages.id, fixture.stage.id));
    expect(inProgress!.status).toBe('in_progress');
    expect(started.json<Checklist>().warnings).toEqual([]);
  });

  it('возвращает только выбранные пункты на доработку и снова включает acceptance после их выполнения', async () => {
    const fixture = await createFixture();
    for (const item of fixture.items) await attachUploadedPhoto(item.id);
    await updateItem(fixture.foreman.cookie, fixture.stage.id, fixture.items[0]!.id, 1);
    await updateItem(fixture.foreman.cookie, fixture.stage.id, fixture.items[1]!.id, 2);
    const [ready] = await getApp().db.select().from(stages).where(eq(stages.id, fixture.stage.id));
    const rework = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/rework`,
      headers: { cookie: fixture.manager.cookie },
      payload: {
        expectedVersion: ready!.version,
        comment: 'Исправить выбранный пункт',
        correctionDueDate: '2099-01-01',
        itemIds: [fixture.items[0]!.id],
      },
    });
    expect(rework.statusCode, rework.body).toBe(200);
    expect(rework.json<Stage>().status).toBe('rework');

    const audit = await auditRecords(getApp().db, fixture.manager.user.id, 'returnStageForRework');
    expect(audit.events).toHaveLength(1);
    expect(audit.changes.map((change) => change.entityType).sort()).toEqual([
      'acceptance_items',
      'acceptances',
      'checklist_items',
      'checklists',
      'stages',
    ]);
    expect(
      audit.changes.every((change) => change.stageId === fixture.stage.id && change.projectId === fixture.project.id),
    ).toBe(true);
    const link = audit.changes.find((change) => change.entityType === 'acceptance_items')!;
    expect(link.entityKey).toEqual({ acceptanceId: link.after!.acceptanceId, checklistItemId: fixture.items[0]!.id });
    expect(link.action).toBe('create');
    const checklist = await getApp().inject({
      method: 'GET',
      url: `/stages/${fixture.stage.id}/checklist`,
      headers: { cookie: fixture.foreman.cookie },
    });
    const current = checklist.json<Checklist>();
    const forbidden = await updateItem(
      fixture.foreman.cookie,
      fixture.stage.id,
      fixture.items[1]!.id,
      current.version,
      false,
    );
    expect(forbidden.statusCode).toBe(403);
    const fixed = await updateItem(fixture.foreman.cookie, fixture.stage.id, fixture.items[0]!.id, current.version);
    expect(fixed.statusCode, fixed.body).toBe(200);
    const [acceptedAgain] = await getApp().db.select().from(stages).where(eq(stages.id, fixture.stage.id));
    expect(acceptedAgain!.status).toBe('acceptance');
  });

  it('только руководитель подтверждает этап и переводит completed в paid при нулевом остатке', async () => {
    const fixture = await createFixture({ itemCount: 1, plannedWorkAmountMinor: 10_000 });
    await attachUploadedPhoto(fixture.items[0]!.id);
    await updateItem(fixture.foreman.cookie, fixture.stage.id, fixture.items[0]!.id, 1);
    const [ready] = await getApp().db.select().from(stages).where(eq(stages.id, fixture.stage.id));
    const foremanAttempt = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/acceptance`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { expectedVersion: ready!.version },
    });
    expect(foremanAttempt.statusCode).toBe(403);
    const accepted = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/acceptance`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: ready!.version },
    });
    expect(accepted.statusCode, accepted.body).toBe(200);
    const completed = accepted.json<Stage>();
    expect(completed.status).toBe('completed');
    expect(completed.actualEndDate).not.toBeNull();

    const unpaid = await getApp().inject({
      method: 'PUT',
      url: `/stages/${fixture.stage.id}/status`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: completed.version, status: 'paid' },
    });
    expect(unpaid.statusCode).toBe(409);
    await getApp().db.insert(workPayments).values({
      stageId: fixture.stage.id,
      paidAt: '2026-10-01',
      amountMinor: 10_000,
      createdByUserId: fixture.manager.user.id,
    });
    const paid = await getApp().inject({
      method: 'PUT',
      url: `/stages/${fixture.stage.id}/status`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: completed.version, status: 'paid' },
    });
    expect(paid.statusCode, paid.body).toBe(200);
    expect(paid.json<Stage>().status).toBe('paid');
  });

  it('разрешает только одно из двух конкурентных изменений одной версии', async () => {
    const fixture = await createFixture();
    for (const item of fixture.items) await attachUploadedPhoto(item.id);
    const [first, second] = await Promise.all([
      updateItem(fixture.foreman.cookie, fixture.stage.id, fixture.items[0]!.id, 1),
      updateItem(fixture.foreman.cookie, fixture.stage.id, fixture.items[1]!.id, 1),
    ]);
    expect([first.statusCode, second.statusCode].sort()).toEqual([200, 409]);
    const checklist = await getApp().inject({
      method: 'GET',
      url: `/stages/${fixture.stage.id}/checklist`,
      headers: { cookie: fixture.foreman.cookie },
    });
    expect(checklist.json<Checklist>().items.filter((item) => item.isCompleted)).toHaveLength(1);
  });

  it('оставляет пустой чек-лист с нулевым прогрессом и не допускает ручную acceptance', async () => {
    const fixture = await createFixture({ itemCount: 1 });
    await getApp().db.delete(checklistItems).where(eq(checklistItems.checklistId, fixture.checklist.id));
    const checklist = await getApp().inject({
      method: 'GET',
      url: `/stages/${fixture.stage.id}/checklist`,
      headers: { cookie: fixture.manager.cookie },
    });
    expect(checklist.json<Checklist>()).toMatchObject({ items: [], progressPercent: 0 });
    const acceptance = await getApp().inject({
      method: 'PUT',
      url: `/stages/${fixture.stage.id}/status`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: 1, status: 'acceptance' },
    });
    expect(acceptance.statusCode).toBe(400);
  });

  it('отклоняет изменение пунктов из закрытых состояний и решения приёмки из неверного состояния', async () => {
    const fixture = await createFixture({ assigned: false, itemCount: 1 });
    await attachUploadedPhoto(fixture.items[0]!.id);
    for (const status of ['created', 'acceptance', 'completed', 'paid'] as const) {
      await getApp().db.update(stages).set({ status }).where(eq(stages.id, fixture.stage.id));
      const response = await updateItem(fixture.manager.cookie, fixture.stage.id, fixture.items[0]!.id, 1);
      expect(response.statusCode, `status=${status}: ${response.body}`).toBe(409);
    }
    await getApp().db.update(stages).set({ status: 'assigned' }).where(eq(stages.id, fixture.stage.id));
    const accept = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/acceptance`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: 1 },
    });
    const rework = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/rework`,
      headers: { cookie: fixture.manager.cookie },
      payload: {
        expectedVersion: 1,
        comment: 'Недопустимый возврат',
        correctionDueDate: '2099-01-01',
        itemIds: [fixture.items[0]!.id],
      },
    });
    expect(accept.statusCode).toBe(409);
    expect(rework.statusCode).toBe(409);
  });

  it('отклоняет supplied и paid из неправильных исходных статусов', async () => {
    const fixture = await createFixture({ assigned: false, itemCount: 1, plannedWorkAmountMinor: 0 });
    const file = await createUploadedMaterialFile();
    await getApp().db.insert(materialInvoices).values({
      stageId: fixture.stage.id,
      fileId: file.id,
      amountMinor: 10_000,
      deliveredAt: new Date(),
      deliveredByUserId: fixture.manager.user.id,
    });
    const supplied = await getApp().inject({
      method: 'PUT',
      url: `/stages/${fixture.stage.id}/status`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: 1, status: 'supplied' },
    });
    await getApp().db.update(stages).set({ status: 'assigned' }).where(eq(stages.id, fixture.stage.id));
    const paid = await getApp().inject({
      method: 'PUT',
      url: `/stages/${fixture.stage.id}/status`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: 1, status: 'paid' },
    });
    expect(supplied.statusCode).toBe(409);
    expect(paid.statusCode).toBe(409);
  });
});
