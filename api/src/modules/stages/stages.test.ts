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
import { addCalendarDays, calendarDate } from '#app/modules/dashboard/calendar';
import { projectModule } from '#app/modules/projects/index';
import { stageModule } from '#app/modules/stages/index';
import { UserRepository } from '#app/modules/users/repository';
import { registerAuthentication } from '#app/plugins/authentication';
import { registerErrorHandler } from '#app/plugins/error-handler';
import { auditRecords } from '#test/audit-records';
import { setupModuleTest } from '#test/setup-module-test';
import { createPaymentPlanRow } from '#test/work-plan-row';

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
    headers: { cookie: manager.cookie, 'idempotency-key': randomUUID() },
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

async function attachUploadedPhoto(itemId: number, position = 1) {
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
  await getApp().db.insert(checklistItemPhotos).values({ checklistItemId: itemId, fileId: file!.id, position });
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
  it('очищает даты независимо и проверяет каждую по обеим границам проекта', async () => {
    const fixture = await createFixture();
    const patch = (expectedVersion: number, fields: object) =>
      getApp().inject({
        method: 'PATCH',
        url: `/stages/${fixture.stage.id}`,
        headers: { cookie: fixture.manager.cookie },
        payload: { expectedVersion, ...fields },
      });
    const startOnly = await patch(1, { plannedEndDate: null });
    expect(startOnly.statusCode, startOnly.body).toBe(200);
    expect(startOnly.json()).toMatchObject({ plannedStartDate: '2026-10-01', plannedEndDate: null });
    for (const fields of [
      { plannedStartDate: '2027-01-01' },
      { plannedEndDate: '2026-09-30' },
      { plannedStartDate: '2026-10-31', plannedEndDate: '2026-10-01' },
    ]) {
      expect((await patch(2, fields)).statusCode).toBe(400);
    }
    const endOnly = await patch(2, { plannedStartDate: null, plannedEndDate: '2026-12-31' });
    expect(endOnly.statusCode, endOnly.body).toBe(200);
    expect(endOnly.json()).toMatchObject({ plannedStartDate: null, plannedEndDate: '2026-12-31' });
    const neither = await patch(3, { plannedEndDate: null });
    expect(neither.statusCode, neither.body).toBe(200);
    expect(neither.json()).toMatchObject({ plannedStartDate: null, plannedEndDate: null });
  });

  it.each([undefined, '2099-01-01'])(
    'проверяет замечание и выбранные пункты, назначает срок доработки %s',
    async (correctionDueDate) => {
      const fixture = await createFixture();
      await getApp().db.update(stages).set({ status: 'acceptance' }).where(eq(stages.id, fixture.stage.id));
      await getApp()
        .db.update(checklistItems)
        .set({ isCompleted: true, completedAt: new Date(), completedByUserId: fixture.foreman.user.id })
        .where(eq(checklistItems.checklistId, fixture.checklist.id));
      const payload = { expectedVersion: fixture.stage.version, comment: 'Исправить', itemIds: [fixture.items[0]!.id] };
      for (const extra of [
        { comment: '' },
        { comment: '   ' },
        { itemIds: [] },
        { itemIds: [fixture.items[0]!.id, fixture.items[0]!.id] },
        { itemIds: [2_147_483_647] },
        { correctionDueDate: addCalendarDays(calendarDate(), -1) },
      ]) {
        const response = await getApp().inject({
          method: 'POST',
          url: `/stages/${fixture.stage.id}/rework`,
          headers: { cookie: fixture.manager.cookie },
          payload: { ...payload, ...extra },
        });
        expect(response.statusCode, response.body).toBe(400);
      }
      expect((await auditRecords(getApp().db, fixture.manager.user.id, 'returnStageForRework')).events).toHaveLength(0);
      const response = await getApp().inject({
        method: 'POST',
        url: `/stages/${fixture.stage.id}/rework`,
        headers: { cookie: fixture.manager.cookie },
        payload: { ...payload, ...(correctionDueDate ? { correctionDueDate } : {}) },
      });
      expect(response.statusCode, response.body).toBe(200);
      expect(response.json<Stage>().latestAcceptance).toMatchObject({
        comment: 'Исправить',
        correctionDueDate: correctionDueDate ?? addCalendarDays(calendarDate(), 2),
      });
      const current = await getApp()
        .db.select()
        .from(checklistItems)
        .where(eq(checklistItems.checklistId, fixture.checklist.id))
        .orderBy(checklistItems.position);
      expect(current[0]).toMatchObject({ isCompleted: false, requiresRework: true });
      expect(current[1]).toMatchObject({ isCompleted: true, requiresRework: false });
    },
  );

  it('возвращает активные типы и 34 пункта шаблонов только руководителю', async () => {
    const fixture = await createFixture();
    const response = await getApp().inject({ url: '/stage-types', headers: { cookie: fixture.manager.cookie } });
    expect(response.statusCode, response.body).toBe(200);
    const types = response.json<Array<{ code: string; position: number; checklistItems: Array<{ title: string }> }>>();
    expect(types.map((type) => type.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(types.flatMap((type) => type.checklistItems)).toHaveLength(34);
    expect(
      types
        .filter((type) => type.code !== 'additional')
        .every((type) => type.checklistItems.at(-1)?.title === 'Уборка'),
    ).toBe(true);
    expect(types.at(-1)).toMatchObject({ code: 'additional', checklistTemplateId: null, checklistItems: [] });
    expect(
      (await getApp().inject({ url: '/stage-types', headers: { cookie: fixture.foreman.cookie } })).statusCode,
    ).toBe(403);
  });

  it('ограничивает списки и total назначением, включает paid и фильтрует архив', async () => {
    const fixture = await createFixture();
    const stranger = await createIdentity('foreman');
    await getApp().db.update(stages).set({ status: 'paid' }).where(eq(stages.id, fixture.stage.id));
    const list = (cookie: string, query = '') =>
      getApp().inject({ url: `/stages?projectId=${fixture.project.id}${query}`, headers: { cookie } });
    const own = await list(fixture.foreman.cookie, '&status=paid&limit=1&offset=0');
    expect(own.statusCode, own.body).toBe(200);
    expect(own.json()).toMatchObject({
      total: 1,
      limit: 1,
      items: [
        {
          id: fixture.stage.id,
          projectOwnerName: fixture.project.ownerName,
          projectAddress: fixture.project.address,
          status: 'paid',
          plannedWorkAmountMinor: 10_000,
          actualWorkAmountMinor: 0,
        },
      ],
    });
    const other = await list(stranger.cookie, `&assigneeId=${fixture.foreman.user.id}`);
    expect(other.json()).toMatchObject({ total: 0, items: [] });
    const projectList = await getApp().inject({
      url: `/projects/${fixture.project.id}/stages`,
      headers: { cookie: fixture.foreman.cookie },
    });
    expect(projectList.json().items).toHaveLength(1);
    expect(
      (await getApp().inject({ url: `/projects/${fixture.project.id}/stages`, headers: { cookie: stranger.cookie } }))
        .statusCode,
    ).toBe(404);
    await getApp().db.update(projects).set({ isArchived: true }).where(eq(projects.id, fixture.project.id));
    expect((await list(fixture.foreman.cookie)).json().total).toBe(0);
    expect((await list(fixture.foreman.cookie, '&includeArchived=true')).json().total).toBe(1);
    expect((await list(fixture.foreman.cookie, '&includeArchived=other')).statusCode).toBe(400);
  });

  it('атомарно меняет даты и планы, проверяет итоговый интервал и версию', async () => {
    const fixture = await createFixture();
    const [neighbor] = await getApp()
      .db.insert(stages)
      .values({
        projectId: fixture.project.id,
        stageTypeCode: 'walls',
        position: 2,
        plannedStartDate: '2026-11-01',
        plannedEndDate: '2026-11-30',
      })
      .returning();
    const patch = (body: object) =>
      getApp().inject({
        method: 'PATCH',
        url: `/stages/${fixture.stage.id}`,
        headers: { cookie: fixture.manager.cookie },
        payload: body,
      });
    const valid = await patch({
      expectedVersion: 1,
      plannedStartDate: '2026-11-10',
      plannedEndDate: '2026-11-20',
      plannedWorkAmountMinor: 20_000,
      plannedMaterialAmountMinor: 30_000,
      notes: 'Новый срок',
    });
    expect(valid.statusCode, valid.body).toBe(200);
    expect(valid.json()).toMatchObject({
      version: 2,
      plannedStartDate: '2026-11-10',
      plannedEndDate: '2026-11-20',
      totalPlannedAmountMinor: 50_000,
    });
    expect((await getApp().db.select().from(stages).where(eq(stages.id, neighbor!.id)))[0]).toEqual(neighbor);
    const stale = await patch({ expectedVersion: 1, plannedEndDate: '2026-12-01' });
    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toMatchObject({ code: 'version_conflict' });
    for (const body of [
      { plannedStartDate: '2026-12-01' },
      { plannedEndDate: '2027-01-01', notes: 'Не сохранить' },
      { plannedWorkAmountMinor: 123 },
      { predecessorStageIds: [] },
      {},
    ]) {
      const result = await patch({ expectedVersion: 2, ...body });
      expect(result.statusCode, result.body).toBe(400);
    }
    const card = await getApp().inject({
      url: `/stages/${fixture.stage.id}`,
      headers: { cookie: fixture.manager.cookie },
    });
    expect(card.json()).toMatchObject({ version: 2, notes: 'Новый срок' });
    expect((await auditRecords(getApp().db, fixture.manager.user.id, 'updateStage')).events).toHaveLength(1);
  });

  it('заменяет состав до старта, сохраняет старые пункты и фото, блокирует изменение после старта', async () => {
    const fixture = await createFixture();
    await attachUploadedPhoto(fixture.items[0]!.id);
    const configure = (cookie: string, body: object) =>
      getApp().inject({
        method: 'PUT',
        url: `/stages/${fixture.stage.id}/checklist`,
        headers: { cookie },
        payload: body,
      });
    const body = { expectedVersion: 1, items: [{ title: 'Новый пункт', photoHint: 'Новая подсказка' }] };
    expect((await configure(fixture.foreman.cookie, body)).statusCode).toBe(403);
    const response = await configure(fixture.manager.cookie, body);
    expect(response.statusCode, response.body).toBe(200);
    const checklist = response.json<Checklist>();
    expect(checklist).toMatchObject({
      version: 2,
      progressPercent: 0,
      items: [{ title: 'Новый пункт', photoHint: 'Новая подсказка', position: 1, isCompleted: false }],
    });
    expect(checklist.items[0]!.id).not.toBe(fixture.items[0]!.id);
    const old = await getApp()
      .db.select()
      .from(checklistItems)
      .where(
        inArray(
          checklistItems.id,
          fixture.items.map((item) => item.id),
        ),
      );
    expect(old.every((item) => item.deletedAt !== null)).toBe(true);
    expect(
      await getApp()
        .db.select()
        .from(checklistItemPhotos)
        .where(eq(checklistItemPhotos.checklistItemId, fixture.items[0]!.id)),
    ).toHaveLength(1);
    expect((await updateItem(fixture.foreman.cookie, fixture.stage.id, fixture.items[0]!.id, 2)).statusCode).toBe(404);
    expect((await configure(fixture.manager.cookie, body)).statusCode).toBe(409);
    await attachUploadedPhoto(checklist.items[0]!.id);
    expect((await updateItem(fixture.foreman.cookie, fixture.stage.id, checklist.items[0]!.id, 2)).statusCode).toBe(
      200,
    );
    expect((await configure(fixture.manager.cookie, { ...body, expectedVersion: 3 })).statusCode).toBe(409);
    const audit = await auditRecords(getApp().db, fixture.manager.user.id, 'configureStageChecklist');
    expect(audit.events).toHaveLength(1);
    expect(audit.changes.some((change) => change.entityType === 'checklist_items' && change.action === 'update')).toBe(
      true,
    );
  });

  it('отказывает в изменении архивного этапа, разрешает правку завершённого', async () => {
    const fixture = await createFixture();
    const patch = () =>
      getApp().inject({
        method: 'PATCH',
        url: `/stages/${fixture.stage.id}`,
        headers: { cookie: fixture.manager.cookie },
        payload: { expectedVersion: 1, notes: 'Новое' },
      });
    await getApp().db.update(projects).set({ isArchived: true }).where(eq(projects.id, fixture.project.id));
    expect((await patch()).json()).toMatchObject({ code: 'project_archived' });
    await getApp().db.update(projects).set({ isArchived: false }).where(eq(projects.id, fixture.project.id));
    await getApp().db.update(stages).set({ status: 'completed' }).where(eq(stages.id, fixture.stage.id));
    const changed = await patch();
    expect(changed.statusCode, changed.body).toBe(200);
    expect(changed.json()).toMatchObject({ status: 'completed', notes: 'Новое' });
  });

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

  it('предупреждает о непосредственно предыдущем включённом этапе, но не блокирует старт', async () => {
    const manager = await createIdentity('manager');
    const foreman = await createIdentity('foreman');
    const response = await getApp().inject({
      method: 'POST',
      url: '/projects',
      headers: { cookie: manager.cookie, 'idempotency-key': randomUUID() },
      payload: {
        ownerName: `Клиент ${randomUUID()}`,
        address: 'Екатеринбург, ул. Последовательная, 1',
        coordinates: { latitude: 56.84, longitude: 60.61 },
        plannedStartDate: '2026-10-01',
        plannedEndDate: '2026-12-31',
        documentFileIds: [],
        stages: [
          {
            type: 'foundation',
            plannedStartDate: '2026-10-01',
            plannedEndDate: '2026-11-15',
            assigneeId: foreman.user.id,
            plannedWorkAmountMinor: null,
            plannedMaterialAmountMinor: null,
            checklistItems: [{ title: 'Фундамент' }],
          },
          {
            type: 'roof',
            plannedStartDate: '2026-10-15',
            plannedEndDate: '2026-12-01',
            assigneeId: foreman.user.id,
            plannedWorkAmountMinor: null,
            plannedMaterialAmountMinor: null,
            checklistItems: [{ title: 'Крыша 1' }, { title: 'Крыша 2' }],
          },
        ],
      },
    });
    expect(response.statusCode, response.body).toBe(201);
    const project = response.json<Project>();
    createdProjectIds.push(project.id);
    const projectStages = await getApp().db.select().from(stages).where(eq(stages.projectId, project.id));
    const previousStage = projectStages.find(({ stageTypeCode }) => stageTypeCode === 'foundation')!;
    const targetStage = projectStages.find(({ stageTypeCode }) => stageTypeCode === 'roof')!;
    const [targetChecklist] = await getApp().db.select().from(checklists).where(eq(checklists.stageId, targetStage.id));
    const [targetItem] = await getApp()
      .db.select()
      .from(checklistItems)
      .where(eq(checklistItems.checklistId, targetChecklist!.id));
    await attachUploadedPhoto(targetItem!.id);

    const started = await updateItem(foreman.cookie, targetStage.id, targetItem!.id, 1);
    expect(started.statusCode, started.body).toBe(200);
    expect(started.json<Checklist>().warnings).toEqual(['materials_incomplete', 'predecessor_incomplete']);
    expect((await getApp().db.select().from(stages).where(eq(stages.id, targetStage.id)))[0]).toMatchObject({
      status: 'in_progress',
    });

    await getApp().db.update(stages).set({ status: 'completed' }).where(eq(stages.id, previousStage.id));
    const afterCompletion = await getApp().inject({
      method: 'GET',
      url: `/stages/${targetStage.id}/checklist`,
      headers: { cookie: foreman.cookie },
    });
    expect(afterCompletion.statusCode, afterCompletion.body).toBe(200);
    expect(afterCompletion.json<Checklist>().warnings).toEqual(['materials_incomplete']);
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
    expect(current.items[0]).toMatchObject({ reworkComment: 'Исправить выбранный пункт', photoCount: 1 });
    const withoutNewPhoto = await updateItem(
      fixture.foreman.cookie,
      fixture.stage.id,
      fixture.items[0]!.id,
      current.version,
    );
    expect(withoutNewPhoto.statusCode).toBe(409);
    expect(withoutNewPhoto.json()).toMatchObject({ code: 'invalid_transition' });
    await attachUploadedPhoto(fixture.items[0]!.id, 2);
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
    await getApp()
      .db.insert(workPayments)
      .values({
        stageId: fixture.stage.id,
        workPlanRowId: (await createPaymentPlanRow(getApp().db, fixture.stage.id, fixture.foreman.user.id)).id,
        recipientId: fixture.foreman.user.id,
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
