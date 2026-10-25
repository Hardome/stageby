import { randomUUID } from 'node:crypto';

import fastifyCookie from '@fastify/cookie';
import { and, count, eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { parseEnvironment } from '#app/config/env';
import { checklistItems, checklists, checklistTemplateItems } from '#app/db/schema/checklists';
import { checklistItemPhotos, files, projectDocuments } from '#app/db/schema/files';
import { materialInvoices } from '#app/db/schema/materials';
import { projects } from '#app/db/schema/projects';
import { stageTypes as stageTypeCatalog } from '#app/db/schema/stage-types';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import { workPayments } from '#app/db/schema/work-payments';
import type { CreateProject, Project, ProjectEdit, StageType } from '#app/generated/types.gen';
import { hashPassword } from '#app/modules/auth/password-hasher';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { materialModule } from '#app/modules/materials/index';
import { projectModule } from '#app/modules/projects/index';
import { stageModule } from '#app/modules/stages/index';
import { UserRepository } from '#app/modules/users/repository';
import { workPaymentModule } from '#app/modules/work-payments/index';
import { registerAuthentication } from '#app/plugins/authentication';
import { registerErrorHandler } from '#app/plugins/error-handler';
import { auditRecords } from '#test/audit-records';
import { setupModuleTest } from '#test/setup-module-test';

const PASSWORD = 'Projects-test-password-123!';
const stageTypes: StageType[] = [
  'foundation',
  'walls',
  'roof',
  'windows',
  'facade',
  'electrical',
  'finishing',
  'heating',
];
const createdUserIds: number[] = [];
const createdProjectIds: number[] = [];
const createdFileIds: number[] = [];
let passwordHash: string;

const projectsTestModule: FastifyPluginAsync = async (app) => {
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
  await app.register(workPaymentModule);
  await app.register(materialModule);
};

const getApp = setupModuleTest(projectsTestModule);

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

async function createIdentity(role: 'manager' | 'foreman' = 'manager', isActive = true) {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 20);
  const user = await new UserRepository(getApp().db).create({
    login: `projects.${suffix}`,
    passwordHash,
    fullName: `Пользователь ${suffix}`,
    role,
  });
  createdUserIds.push(user.id);
  if (!isActive) {
    await getApp().db.update(users).set({ isActive: false }).where(eq(users.id, user.id));
    return { user, cookie: '' };
  }
  const issued = await new SessionService(new SessionRepository(getApp().db), 12).issue(user.id);
  return { user, cookie: `stageby_session=${issued.accessToken}` };
}

function stage(type: StageType, overrides: Partial<CreateProject['stages'][number]> = {}) {
  return {
    type,
    plannedStartDate: '2026-10-05',
    plannedEndDate: '2026-10-30',
    assigneeId: null,
    plannedWorkAmountMinor: null,
    plannedMaterialAmountMinor: null,
    ...overrides,
  } satisfies CreateProject['stages'][number];
}

function payload(overrides: Partial<CreateProject> = {}): CreateProject {
  return {
    ownerName: `Клиент ${randomUUID()}`,
    address: 'Екатеринбург, ул. Примерная, 12',
    coordinates: { latitude: 56.838_011, longitude: 60.597_474 },
    plannedStartDate: '2026-10-05',
    plannedEndDate: '2027-05-28',
    documentFileIds: [],
    stages: [stage('foundation')],
    ...overrides,
  };
}

async function createProject(cookie: string, body: CreateProject, key = randomUUID()) {
  const response = await getApp().inject({
    method: 'POST',
    url: '/projects',
    headers: { cookie, 'idempotency-key': key },
    payload: body,
  });
  if (response.statusCode === 201) {
    const project = response.json<Project>();
    if (!createdProjectIds.includes(project.id)) {
      createdProjectIds.push(project.id);
    }
  }
  return response;
}

async function editForm(cookie: string, projectId: number) {
  const response = await getApp().inject({ url: `/projects/${projectId}/edit`, headers: { cookie } });
  if (response.statusCode !== 200) throw new Error(response.body);
  return response.json<ProjectEdit>();
}

async function editFixture() {
  const manager = await createIdentity();
  const foreman = await createIdentity('foreman');
  const response = await createProject(
    manager.cookie,
    payload({
      stages: ['foundation', 'walls'].map((type) =>
        stage(type as StageType, {
          assigneeId: foreman.user.id,
          plannedWorkAmountMinor: 1000,
          plannedMaterialAmountMinor: 2000,
          checklistItems: [{ title: 'Проверка' }, { title: 'Уборка' }],
        }),
      ),
    }),
  );
  const project = response.json<Project>();
  const form = await editForm(manager.cookie, project.id);
  const patch = (body: object) =>
    getApp().inject({
      method: 'PATCH',
      url: `/projects/${project.id}`,
      headers: { cookie: manager.cookie },
      payload: { expectedVersion: form.project.version, ...body },
    });
  return { manager, foreman, project, form, patch };
}

async function storedFile(
  userId: number,
  purpose: 'project_document' | 'checklist_photo' | 'material_invoice' = 'project_document',
) {
  const now = new Date();
  const [file] = await getApp()
    .db.insert(files)
    .values({
      status: 'uploaded',
      purpose,
      storageKey: randomUUID(),
      originalName: purpose === 'checklist_photo' ? 'photo.jpg' : 'document.pdf',
      mimeType: purpose === 'checklist_photo' ? 'image/jpeg' : 'application/pdf',
      sizeBytes: 1024,
      checksumMd5: 'a'.repeat(32),
      uploadedByUserId: userId,
      uploadedAt: now,
      uploadExpiresAt: now,
    })
    .returning();
  createdFileIds.push(file!.id);
  return file!;
}

describe('Composite project editing', () => {
  it('возвращает все девять включённых этапов после добавления дополнительного', async () => {
    const manager = await createIdentity();
    const created = (
      await createProject(manager.cookie, payload({ stages: stageTypes.map((type) => ({ type })) }))
    ).json<Project>();
    const saved = await getApp().inject({
      method: 'PATCH',
      url: `/projects/${created.id}`,
      headers: { cookie: manager.cookie },
      payload: {
        expectedVersion: created.version,
        additionalStage: { checklistItems: [{ title: 'Дополнительная проверка' }] },
      },
    });
    expect(saved.statusCode, saved.body).toBe(200);
    const response = await getApp().inject({
      url: `/projects/${created.id}/stages`,
      headers: { cookie: manager.cookie },
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().items).toHaveLength(9);
    expect((await editForm(manager.cookie, created.id)).stages).toHaveLength(9);
  });
  it('загружает форму только руководителю и не показывает исключённые этапы в обычных списках', async () => {
    const { manager, foreman, form, project, patch } = await editFixture();
    const first = form.stages[0]!;
    const response = await patch({
      stages: [{ id: first.stage.id, expectedVersion: first.stage.version, isIncluded: false }],
    });
    expect(response.statusCode, response.body).toBe(200);
    const edited = await editForm(manager.cookie, project.id);
    expect(edited.project.version).toBe(2);
    expect(edited.stages).toHaveLength(2);
    expect(edited.stages[0]).toMatchObject({
      stage: { id: first.stage.id, isIncluded: false },
      checklist: { id: first.checklist.id },
    });
    for (const cookie of ['', foreman.cookie])
      expect((await getApp().inject({ url: `/projects/${project.id}/edit`, headers: { cookie } })).statusCode).toBe(
        cookie ? 403 : 401,
      );
    expect(
      (await getApp().inject({ url: '/projects/2147483647/edit', headers: { cookie: manager.cookie } })).statusCode,
    ).toBe(404);
    const list = await getApp().inject({ url: `/projects/${project.id}/stages`, headers: { cookie: manager.cookie } });
    expect(list.json().items.map((item: { id: number }) => item.id)).toEqual([form.stages[1]!.stage.id]);
  });

  it('сохраняет реквизиты и вложенные изменения одним событием аудита с сохранением выплат', async () => {
    const { manager, foreman, form, project, patch } = await editFixture();
    const first = form.stages[0]!;
    const [payment] = await getApp()
      .db.insert(workPayments)
      .values({
        stageId: first.stage.id,
        recipientId: foreman.user.id,
        amountMinor: 100,
        paidAt: '2026-10-12',
        createdByUserId: manager.user.id,
      })
      .returning();
    const response = await patch({
      ownerName: 'Новое имя',
      notes: 'Примечание',
      stages: [
        {
          id: first.stage.id,
          expectedVersion: first.stage.version,
          plannedStartDate: null,
          plannedWorkAmountMinor: 5000,
          checklist: { expectedVersion: first.checklist.version, items: [{ title: 'Новый пункт' }] },
        },
      ],
    });
    expect(response.statusCode, response.body).toBe(200);
    const edited = await editForm(manager.cookie, project.id);
    expect(edited.project).toMatchObject({
      version: 2,
      finances: { plannedWorkAmountMinor: 6000, actualWorkAmountMinor: 100 },
    });
    expect(edited.stages[0]).toMatchObject({
      stage: { id: first.stage.id, plannedStartDate: null, version: 2 },
      checklist: { id: first.checklist.id, version: 2, items: [{ title: 'Новый пункт' }] },
    });
    expect(edited.stages[1]).toEqual({
      ...form.stages[1],
      stage: { ...form.stages[1]!.stage, projectOwnerName: 'Новое имя' },
    });
    expect((await getApp().db.select().from(workPayments).where(eq(workPayments.id, payment!.id)))[0]).toMatchObject({
      id: payment!.id,
      recipientId: foreman.user.id,
    });
    const audit = await auditRecords(getApp().db, manager.user.id, 'updateProject');
    expect(audit.events).toHaveLength(1);
    expect(new Set(audit.changes.map((change) => change.entityType))).toEqual(
      new Set(['projects', 'stages', 'checklists', 'checklist_items']),
    );
    expect(audit.changes.find((change) => change.entityType === 'projects')?.after).toMatchObject({ version: 2 });
  });

  it('конфликт любой вложенной версии отменяет всю форму и не создаёт аудит', async () => {
    const { manager, form, project, patch } = await editFixture();
    const first = form.stages[0]!;
    const second = form.stages[1]!;
    for (const change of [
      { expectedVersion: 99 },
      { stages: [{ id: second.stage.id, expectedVersion: 99, notes: 'Не сохранить' }] },
      {
        stages: [
          {
            id: second.stage.id,
            expectedVersion: 1,
            checklist: { expectedVersion: 99, items: [{ title: 'Не сохранить' }] },
          },
        ],
      },
    ]) {
      const response = await patch({
        address: 'Не сохранить',
        stages: [{ id: first.stage.id, expectedVersion: 1, plannedWorkAmountMinor: 2000 }],
        ...change,
      });
      expect(response.statusCode, response.body).toBe(409);
      expect(response.json().code).toBe('version_conflict');
      expect(await editForm(manager.cookie, project.id)).toEqual(form);
    }
    expect((await auditRecords(getApp().db, manager.user.id, 'updateProject')).events).toHaveLength(0);
  });

  it.each([
    [null, null],
    ['2026-11-01', null],
    [null, '2026-11-30'],
    ['2026-11-01', '2026-11-30'],
  ])('атомарно переносит проект и независимо nullable-даты этапов: %s / %s', async (start, end) => {
    const { manager, form, project, patch } = await editFixture();
    const response = await patch({
      plannedStartDate: '2026-11-01',
      plannedEndDate: '2026-11-30',
      stages: form.stages.map(({ stage }) => ({
        id: stage.id,
        expectedVersion: stage.version,
        plannedStartDate: start,
        plannedEndDate: end,
      })),
    });
    expect(response.statusCode, response.body).toBe(200);
    const edited = await editForm(manager.cookie, project.id);
    expect(edited.stages.every(({ stage }) => stage.plannedStartDate === start && stage.plannedEndDate === end)).toBe(
      true,
    );
    expect(edited.project).toMatchObject({ plannedStartDate: '2026-11-01', plannedEndDate: '2026-11-30' });
  });

  it('проверяет итоговые границы, принадлежность ресурсов и запрет ручного изменения общих планов', async () => {
    const { manager, form, project, patch } = await editFixture();
    const first = form.stages[0]!;
    const _second = form.stages[1]!;
    for (const change of [
      { plannedStartDate: '2026-10-06' },
      { plannedEndDate: '2026-10-20' },
      { stages: [{ id: first.stage.id, expectedVersion: 1, plannedEndDate: '2026-10-04' }] },
      {
        stages: [
          { id: first.stage.id, expectedVersion: 1 },
          { id: first.stage.id, expectedVersion: 1 },
        ],
      },
      { stages: [{ id: 2_147_483_647, expectedVersion: 1 }] },
      { finances: { plannedWorkAmountMinor: 0 } },
      { stages: [{ id: first.stage.id, expectedVersion: 1, unexpected: true }] },
      { stages: [{ id: first.stage.id, expectedVersion: 1, plannedWorkAmountMinor: 101 }] },
      { additionalStage: { checklistItems: [] } },
    ]) {
      const response = await patch({ notes: 'Не сохранить', ...change });
      expect(response.statusCode, response.body).toBe(400);
      expect(await editForm(manager.cookie, project.id)).toEqual(form);
    }
  });

  it('восстанавливает прежний этап после проверки актуальных дат и назначения', async () => {
    const { manager, foreman, form, project, patch } = await editFixture();
    const first = form.stages[0]!;
    expect((await patch({ stages: [{ id: first.stage.id, expectedVersion: 1, isIncluded: false }] })).statusCode).toBe(
      200,
    );
    expect(
      (
        await patch({
          expectedVersion: 2,
          plannedStartDate: '2026-11-01',
          stages: [{ id: form.stages[1]!.stage.id, expectedVersion: 1, plannedStartDate: null, plannedEndDate: null }],
        })
      ).statusCode,
    ).toBe(200);
    const restore = { id: first.stage.id, expectedVersion: 2, isIncluded: true };
    expect((await patch({ expectedVersion: 3, stages: [restore] })).statusCode).toBe(400);
    await getApp().db.update(users).set({ isActive: false }).where(eq(users.id, foreman.user.id));
    expect(
      (await patch({ expectedVersion: 3, stages: [{ ...restore, plannedStartDate: null, plannedEndDate: null }] }))
        .statusCode,
    ).toBe(400);
    const response = await patch({
      expectedVersion: 3,
      stages: [{ ...restore, plannedStartDate: null, plannedEndDate: null, assigneeId: null }],
    });
    expect(response.statusCode, response.body).toBe(200);
    const edited = await editForm(manager.cookie, project.id);
    expect(edited.stages[0]).toMatchObject({
      stage: { id: first.stage.id, isIncluded: true },
      checklist: { id: first.checklist.id },
    });
  });

  it.each(['started', 'photo', 'deleted_photo', 'retained_photo', 'invoice', 'payment'] as const)(
    'блокирует исключение этапа с историей %s',
    async (history) => {
      const { manager, foreman, form, project, patch } = await editFixture();
      const first = form.stages[0]!;
      if (history === 'started')
        await getApp().db.update(stages).set({ actualStartDate: '2026-10-12' }).where(eq(stages.id, first.stage.id));
      if (history.includes('photo')) {
        const file = await storedFile(manager.user.id, 'checklist_photo');
        await getApp()
          .db.insert(checklistItemPhotos)
          .values({
            checklistItemId: first.checklist.items[0]!.id,
            fileId: file.id,
            position: 1,
            deletedAt: history === 'photo' ? null : new Date(),
            deletedByRetention: history === 'retained_photo',
          });
      }
      if (history === 'invoice') {
        const file = await storedFile(manager.user.id, 'material_invoice');
        await getApp()
          .db.insert(materialInvoices)
          .values({ stageId: first.stage.id, fileId: file.id, amountMinor: 100 });
      }
      if (history === 'payment')
        await getApp().db.insert(workPayments).values({
          stageId: first.stage.id,
          recipientId: foreman.user.id,
          createdByUserId: manager.user.id,
          amountMinor: 100,
          paidAt: '2026-10-12',
        });
      const before = await editForm(manager.cookie, project.id);
      const response = await patch({
        notes: 'Не сохранить',
        stages: [{ id: first.stage.id, expectedVersion: 1, isIncluded: false }],
      });
      expect(response.statusCode, response.body).toBe(409);
      expect(await editForm(manager.cookie, project.id)).toEqual(before);
    },
  );

  it('не исключает последний этап и не меняет состав после старта даже без отметок', async () => {
    const { form, patch } = await editFixture();
    expect(
      (
        await patch({
          stages: form.stages.map(({ stage }) => ({ id: stage.id, expectedVersion: 1, isIncluded: false })),
        })
      ).statusCode,
    ).toBe(400);
    const first = form.stages[0]!;
    await getApp()
      .db.update(stages)
      .set({ actualStartDate: '2026-10-12', status: 'in_progress' })
      .where(eq(stages.id, first.stage.id));
    const response = await patch({
      stages: [
        {
          id: first.stage.id,
          expectedVersion: 1,
          checklist: { expectedVersion: 1, items: [{ title: 'Изменённый состав' }] },
        },
      ],
    });
    expect(response.statusCode, response.body).toBe(409);
    expect(
      (await getApp().db.select().from(checklistItems).where(eq(checklistItems.checklistId, first.checklist.id))).every(
        (item) => !item.isCompleted,
      ),
    ).toBe(true);
    const unchanged = await patch({
      stages: [
        {
          id: first.stage.id,
          expectedVersion: 1,
          plannedMaterialAmountMinor: 3000,
          checklist: {
            expectedVersion: 1,
            items: first.checklist.items.map(({ title, photoHint }) => ({ title, photoHint })),
          },
        },
      ],
    });
    expect(unchanged.statusCode, unchanged.body).toBe(200);
  });

  it('добавляет additional к завершённому объекту, затем восстанавливает его вместо дубля', async () => {
    const { manager, form, project, patch } = await editFixture();
    await getApp().db.update(stages).set({ status: 'paid' }).where(eq(stages.projectId, project.id));
    expect((await editForm(manager.cookie, project.id)).project.status).toBe('completed');
    const response = await patch({
      additionalStage: { plannedWorkAmountMinor: 0, checklistItems: [{ title: 'Дополнительные работы' }] },
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json().status).toBe('in_progress');
    const edited = await editForm(manager.cookie, project.id);
    const additional = edited.stages[2]!;
    expect(additional).toMatchObject({
      stage: { type: 'additional', position: 9, isIncluded: true },
      checklist: { items: [{ title: 'Дополнительные работы' }] },
    });
    expect(
      (
        await patch({
          expectedVersion: 2,
          stages: [{ id: additional.stage.id, expectedVersion: 1, isIncluded: false }],
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await patch({ expectedVersion: 3, additionalStage: { checklistItems: [{ title: 'Дубль' }] } })).statusCode,
    ).toBe(409);
    expect(
      (await patch({ expectedVersion: 3, stages: [{ id: additional.stage.id, expectedVersion: 2, isIncluded: true }] }))
        .statusCode,
    ).toBe(200);
    const restored = await editForm(manager.cookie, project.id);
    expect(restored.stages.map(({ stage }) => stage.id)).toEqual([
      ...form.stages.map(({ stage }) => stage.id),
      additional.stage.id,
    ]);
    expect(restored.stages[2]!.checklist.id).toBe(additional.checklist.id);
    await getApp().db.update(stages).set({ status: 'paid' }).where(eq(stages.id, additional.stage.id));
    expect((await editForm(manager.cookie, project.id)).project.status).toBe('completed');
  });

  it('не меняет архивный объект, разархивирует отдельно и проверяет версии', async () => {
    const { manager, project, patch } = await editFixture();
    expect((await patch({ isArchived: true })).statusCode).toBe(200);
    for (const body of [{ notes: 'Изменение' }, { isArchived: false, notes: 'Изменение' }])
      expect((await patch({ expectedVersion: 2, ...body })).statusCode).toBe(409);
    expect((await patch({ expectedVersion: 2, isArchived: false })).statusCode).toBe(200);
    expect((await editForm(manager.cookie, project.id)).project).toMatchObject({ isArchived: false, version: 3 });
    expect((await patch({ notes: 'Устаревшее изменение' })).json().code).toBe('version_conflict');
  });

  it('параллельные сохранения версии объекта дают один успех и один конфликт', async () => {
    const { manager, project, patch } = await editFixture();
    const responses = await Promise.all([patch({ notes: 'Первый' }), patch({ notes: 'Второй' })]);
    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 409]);
    expect((await editForm(manager.cookie, project.id)).project.version).toBe(2);
    expect((await auditRecords(getApp().db, manager.user.id, 'updateProject')).events).toHaveLength(1);
  });

  it('сохраняет ID и версии при повторном сохранении того же чек-листа и документов', async () => {
    const { manager, form, project, patch } = await editFixture();
    const first = form.stages[0]!;
    const response = await patch({
      documentFileIds: [],
      stages: [
        {
          id: first.stage.id,
          expectedVersion: first.stage.version,
          plannedWorkAmountMinor: first.stage.plannedWorkAmountMinor,
          checklist: {
            expectedVersion: first.checklist.version,
            items: first.checklist.items.map(({ title, photoHint }) => ({ title, photoHint })),
          },
        },
      ],
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(await editForm(manager.cookie, project.id)).toEqual(form);
    expect((await auditRecords(getApp().db, manager.user.id, 'updateProject')).events).toHaveLength(0);
  });

  it('пересчитывает paid в составном сохранении, сохраняя фактические даты и прошлых получателей', async () => {
    const { manager, foreman, form, project, patch } = await editFixture();
    const first = form.stages[0]!;
    await getApp().db.insert(workPayments).values({
      stageId: first.stage.id,
      recipientId: foreman.user.id,
      createdByUserId: manager.user.id,
      amountMinor: 1000,
      paidAt: '2026-10-12',
    });
    await getApp()
      .db.update(stages)
      .set({ status: 'paid', actualStartDate: '2026-10-05', actualEndDate: '2026-10-12' })
      .where(eq(stages.id, first.stage.id));
    const increased = await patch({
      stages: [{ id: first.stage.id, expectedVersion: 1, plannedWorkAmountMinor: 1100 }],
    });
    expect(increased.statusCode, increased.body).toBe(200);
    expect((await editForm(manager.cookie, project.id)).stages[0]!.stage).toMatchObject({
      status: 'completed',
      version: 2,
    });
    expect(
      (
        await patch({
          expectedVersion: 2,
          stages: [
            {
              id: first.stage.id,
              expectedVersion: 2,
              plannedWorkAmountMinor: 900,
              plannedStartDate: null,
              assigneeId: null,
            },
          ],
        })
      ).statusCode,
    ).toBe(200);
    expect((await editForm(manager.cookie, project.id)).stages[0]!.stage).toMatchObject({
      status: 'paid',
      actualStartDate: '2026-10-05',
      actualEndDate: '2026-10-12',
      plannedWorkAmountMinor: 900,
      assignee: null,
    });
    expect(
      (await getApp().db.select().from(workPayments).where(eq(workPayments.stageId, first.stage.id)))[0]!.recipientId,
    ).toBe(foreman.user.id);
  });

  it('атомарно заменяет и переставляет PDF, сохраняет ID связей и проверяет новые файлы', async () => {
    const { manager, foreman, form, project, patch } = await editFixture();
    const first = await storedFile(manager.user.id);
    const second = await storedFile(manager.user.id);
    const other = await storedFile(foreman.user.id);
    expect((await patch({ documentFileIds: [first.id, second.id] })).statusCode).toBe(200);
    const links = await getApp().db.select().from(projectDocuments).where(eq(projectDocuments.projectId, project.id));
    expect((await patch({ expectedVersion: 2, documentFileIds: [second.id, first.id] })).statusCode).toBe(200);
    const reordered = await editForm(manager.cookie, project.id);
    expect(reordered.project.documentFileIds).toEqual([second.id, first.id]);
    expect(
      (await getApp().db.select().from(projectDocuments).where(eq(projectDocuments.projectId, project.id)))
        .map((row) => row.id)
        .sort(),
    ).toEqual(links.map((row) => row.id).sort());
    const invalid = await patch({
      expectedVersion: 3,
      documentFileIds: [other.id],
      stages: [{ id: form.stages[0]!.stage.id, expectedVersion: 1, plannedWorkAmountMinor: 0 }],
    });
    expect(invalid.statusCode, invalid.body).toBe(400);
    expect(await editForm(manager.cookie, project.id)).toEqual(reordered);
    expect((await patch({ expectedVersion: 3, documentFileIds: [first.id] })).statusCode).toBe(200);
    expect((await editForm(manager.cookie, project.id)).project.documentFileIds).toEqual([first.id]);
    expect((await patch({ expectedVersion: 4, documentFileIds: [first.id] })).statusCode).toBe(200);
    expect((await editForm(manager.cookie, project.id)).project.version).toBe(4);
  });

  it.each(['payment', 'invoice'] as const)('согласует исключение этапа и отдельное создание %s', async (resource) => {
    const { manager, form, project, patch } = await editFixture();
    const first = form.stages[0]!;
    const file = await storedFile(manager.user.id, 'material_invoice');
    const mutation = getApp().inject({
      method: 'POST',
      url:
        resource === 'payment'
          ? `/stages/${first.stage.id}/work-payments`
          : `/stages/${first.stage.id}/material-invoices`,
      headers: { cookie: manager.cookie },
      payload:
        resource === 'payment' ? { amountMinor: 100, paidAt: '2026-10-12' } : { fileId: file.id, amountMinor: 100 },
    });
    const [excluded, created] = await Promise.all([
      patch({ stages: [{ id: first.stage.id, expectedVersion: 1, isIncluded: false }] }),
      mutation,
    ]);
    expect([
      [200, 404],
      [409, 201],
    ]).toContainEqual([excluded.statusCode, created.statusCode]);
    const edited = await editForm(manager.cookie, project.id);
    expect(edited.stages[0]!.stage.isIncluded).toBe(created.statusCode === 201);
  });
});

describe('Composite project creation', () => {
  it.each(stageTypes)('создаёт с заполненным этапом %s и шаблонами остальных семи', async (selectedType) => {
    const manager = await createIdentity();
    const foreman = await createIdentity('foreman');
    const catalogBefore = await getApp().db.select().from(stageTypeCatalog).orderBy(stageTypeCatalog.position);
    const templatesBefore = await getApp().db.select().from(checklistTemplateItems).orderBy(checklistTemplateItems.id);
    const response = await createProject(
      manager.cookie,
      payload({
        stages: stageTypes.map((type) =>
          type === selectedType
            ? stage(type, {
                assigneeId: foreman.user.id,
                plannedWorkAmountMinor: 10_000,
                plannedMaterialAmountMinor: 20_000,
                checklistItems: [{ title: 'Индивидуальный пункт' }],
              })
            : { type },
        ),
      }),
    );
    expect(response.statusCode, response.body).toBe(201);
    const form = await editForm(manager.cookie, response.json<Project>().id);
    expect(form.stages).toHaveLength(8);
    const selected = form.stages.find(({ stage }) => stage.type === selectedType)!;
    expect(selected.stage).toMatchObject({
      assignee: { id: foreman.user.id },
      plannedStartDate: '2026-10-05',
      plannedEndDate: '2026-10-30',
      plannedWorkAmountMinor: 10_000,
      plannedMaterialAmountMinor: 20_000,
    });
    expect(selected.checklist.items.map(({ title }) => title)).toEqual(['Индивидуальный пункт']);
    const unopened = form.stages.filter(({ stage }) => stage.type !== selectedType);
    expect(unopened).toHaveLength(7);
    for (const entry of unopened) {
      expect(entry.stage).toMatchObject({
        assignee: null,
        plannedStartDate: null,
        plannedEndDate: null,
        plannedWorkAmountMinor: null,
        plannedMaterialAmountMinor: null,
      });
      expect(entry.checklist.items.length).toBeGreaterThan(0);
      expect(entry.checklist.items.map(({ title }) => title)).toContain('Уборка');
    }
    expect(await getApp().db.select().from(stageTypeCatalog).orderBy(stageTypeCatalog.position)).toEqual(catalogBefore);
    expect(await getApp().db.select().from(checklistTemplateItems).orderBy(checklistTemplateItems.id)).toEqual(
      templatesBefore,
    );
  });

  it('быстро создаёт восемь этапов только по типам, без назначения, дат и планов', async () => {
    const manager = await createIdentity();
    const response = await createProject(manager.cookie, payload({ stages: stageTypes.map((type) => ({ type })) }));
    expect(response.statusCode, response.body).toBe(201);
    const project = response.json<Project>();
    expect(project).toMatchObject({
      status: 'created',
      finances: {
        plannedWorkAmountMinor: null,
        plannedMaterialAmountMinor: null,
        actualWorkAmountMinor: 0,
        actualMaterialAmountMinor: 0,
        isPlanComplete: false,
      },
    });
    const storedStages = await getApp().db.select().from(stages).where(eq(stages.projectId, project.id));
    expect(storedStages).toHaveLength(8);
    for (const stored of storedStages)
      expect(stored).toMatchObject({
        status: 'created',
        isIncluded: true,
        assigneeId: null,
        plannedStartDate: null,
        plannedEndDate: null,
        plannedWorkAmountMinor: null,
        plannedMaterialAmountMinor: null,
      });
    const items = await getApp()
      .db.select()
      .from(checklistItems)
      .innerJoin(checklists, eq(checklists.id, checklistItems.checklistId))
      .where(
        inArray(
          checklists.stageId,
          storedStages.map(({ id }) => id),
        ),
      );
    expect(items).toHaveLength(34);
  });

  it('сохраняет заполненный и неоткрытые этапы, различает нулевой и незаданный план', async () => {
    const manager = await createIdentity();
    const foreman = await createIdentity('foreman');
    const response = await createProject(
      manager.cookie,
      payload({
        stages: [
          { type: 'roof' },
          {
            type: 'foundation',
            assigneeId: foreman.user.id,
            plannedWorkAmountMinor: 0,
            plannedMaterialAmountMinor: 0,
            checklistItems: [{ title: 'Свой пункт' }],
          },
          { type: 'walls', plannedWorkAmountMinor: 10_000 },
        ],
      }),
    );
    expect(response.statusCode, response.body).toBe(201);
    const storedStages = await getApp().db.select().from(stages).where(eq(stages.projectId, response.json().id));
    expect(storedStages).toHaveLength(3);
    expect(storedStages.find((item) => item.stageTypeCode === 'foundation')?.plannedWorkAmountMinor).toBe(0);
    expect(storedStages.find((item) => item.stageTypeCode === 'walls')?.plannedWorkAmountMinor).toBe(10_000);
  });

  it.each([
    ['plannedStartDate', '2026-10-04'],
    ['plannedStartDate', '2027-05-29'],
    ['plannedEndDate', '2026-10-04'],
    ['plannedEndDate', '2027-05-29'],
  ] as const)('возвращает путь ошибочной даты %s = %s', async (field, date) => {
    const manager = await createIdentity();
    const response = await createProject(
      manager.cookie,
      payload({ stages: [{ type: 'foundation' }, { type: 'walls', [field]: date }] }),
    );
    expect(response.statusCode).toBe(400);
    expect(response.json().details).toContainEqual(expect.objectContaining({ path: `body.stages.1.${field}` }));
    expect((await auditRecords(getApp().db, manager.user.id, 'createProject')).events).toHaveLength(0);
  });

  it('проверяет порядок дат этапа и обязательные реквизиты с путями полей', async () => {
    const manager = await createIdentity();
    const invalidBodies = [
      [
        payload({ stages: [{ type: 'foundation', plannedStartDate: '2026-11-01', plannedEndDate: '2026-10-31' }] }),
        'body.stages.0.plannedEndDate',
      ],
      [payload({ ownerName: 'А'.repeat(151) }), 'body.ownerName'],
      [payload({ ownerName: '   ' }), 'body.ownerName'],
      [payload({ address: '' }), 'body.address'],
      [payload({ plannedEndDate: '2026-10-04' }), 'body.plannedEndDate'],
      [payload({ coordinates: { latitude: 91, longitude: 60 } }), 'body.coordinates.latitude'],
    ] as const;
    for (const [body, path] of invalidBodies) {
      const response = await createProject(manager.cookie, body);
      expect(response.statusCode, response.body).toBe(400);
      expect(response.json().details).toContainEqual(expect.objectContaining({ path }));
    }
  });
  it.each([
    [null, null],
    ['2026-10-05', null],
    [null, '2027-05-28'],
    ['2026-10-05', '2027-05-28'],
  ])('создаёт этап с независимыми датами %s / %s', async (plannedStartDate, plannedEndDate) => {
    const manager = await createIdentity();
    const response = await createProject(
      manager.cookie,
      payload({ stages: [stage('foundation', { plannedStartDate, plannedEndDate })] }),
    );
    expect(response.statusCode, response.body).toBe(201);
    const [created] = await getApp().db.select().from(stages).where(eq(stages.projectId, response.json().id));
    expect(created).toMatchObject({ plannedStartDate, plannedEndDate, isIncluded: true });
  });

  it('принимает отсутствие обеих дат, запрещает additional при создании', async () => {
    const manager = await createIdentity();
    const value = stage('foundation');
    const { plannedStartDate: _start, plannedEndDate: _end, ...withoutDates } = value;
    const response = await createProject(manager.cookie, payload({ stages: [withoutDates] }));
    expect(response.statusCode, response.body).toBe(201);
    const [created] = await getApp().db.select().from(stages).where(eq(stages.projectId, response.json().id));
    expect(created).toMatchObject({ plannedStartDate: null, plannedEndDate: null });
    const invalid = await createProject(
      manager.cookie,
      payload({ stages: [stage('additional', { checklistItems: [{ title: 'Свой пункт' }] })] }),
    );
    expect(invalid.statusCode).toBe(400);
  });

  it('вычисляет общий план из ручных планов включённых этапов, исключает additional из итогов', async () => {
    const manager = await createIdentity();
    const response = await createProject(
      manager.cookie,
      payload({
        stages: [stage('foundation', { plannedWorkAmountMinor: 10_000, plannedMaterialAmountMinor: 20_000 })],
      }),
    );
    expect(response.statusCode, response.body).toBe(201);
    const project = response.json<Project>();
    await getApp().db.insert(stages).values({
      projectId: project.id,
      stageTypeCode: 'additional',
      position: 9,
      isIncluded: false,
      plannedWorkAmountMinor: 99_000,
      plannedMaterialAmountMinor: 99_000,
    });
    const read = await getApp().inject({ url: `/projects/${project.id}`, headers: { cookie: manager.cookie } });
    expect(read.json().finances).toMatchObject({
      plannedWorkAmountMinor: 10_000,
      plannedMaterialAmountMinor: 20_000,
      totalPlannedAmountMinor: 30_000,
    });
    await expect(
      getApp().db.insert(stages).values({ projectId: project.id, stageTypeCode: 'additional', position: 8 }),
    ).rejects.toThrow();
  });

  it('повторяет создание без дубля и аудита, отклоняет изменение тела с тем же ключом', async () => {
    const manager = await createIdentity();
    const body = payload();
    const key = randomUUID();
    const first = await createProject(manager.cookie, body, key);
    const repeated = await createProject(manager.cookie, body, key);
    expect(first.statusCode, first.body).toBe(201);
    expect(repeated.json()).toEqual(first.json());
    const conflict = await createProject(manager.cookie, { ...body, address: 'Другой адрес' }, key);
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toMatchObject({ code: 'idempotency_conflict' });
    const audit = await auditRecords(getApp().db, manager.user.id, 'createProject');
    expect(audit.events).toHaveLength(1);
  });

  it('сохраняет один объект при одновременном повторе одного ключа', async () => {
    const manager = await createIdentity();
    const body = payload();
    const key = randomUUID();
    const responses = await Promise.all([
      createProject(manager.cookie, body, key),
      createProject(manager.cookie, body, key),
    ]);
    expect(responses.map((response) => response.statusCode)).toEqual([201, 201]);
    expect(responses[0]!.json()).toEqual(responses[1]!.json());
    expect((await auditRecords(getApp().db, manager.user.id, 'createProject')).events).toHaveLength(1);
  });

  it('требует корректный ключ создания и не сохраняет объект при отказе', async () => {
    const manager = await createIdentity();
    for (const key of [undefined, 'short', 'invalid key with spaces']) {
      const response = await getApp().inject({
        method: 'POST',
        url: '/projects',
        headers: { cookie: manager.cookie, ...(key === undefined ? {} : { 'idempotency-key': key }) },
        payload: payload(),
      });
      expect(response.statusCode).toBe(400);
    }
    expect((await auditRecords(getApp().db, manager.user.id, 'createProject')).events).toHaveLength(0);
  });

  it('читает и фильтрует объекты, скрывает карточку и общие суммы от мастера', async () => {
    const manager = await createIdentity();
    const foreman = await createIdentity('foreman');
    const body = payload({
      stages: [
        stage('foundation', { plannedWorkAmountMinor: 10_000, plannedMaterialAmountMinor: 20_000 }),
        stage('walls'),
      ],
    });
    const response = await createProject(manager.cookie, body);
    const project = response.json<Project>();
    const card = await getApp().inject({ url: `/projects/${project.id}`, headers: { cookie: manager.cookie } });
    expect(card.statusCode, card.body).toBe(200);
    expect(card.json()).toMatchObject({
      status: 'created',
      finances: {
        plannedWorkAmountMinor: null,
        plannedMaterialAmountMinor: null,
        totalPlannedAmountMinor: null,
        totalActualAmountMinor: 0,
        isPlanComplete: false,
        variancePercent: null,
      },
    });
    const page = await getApp().inject({
      url: `/projects?search=${encodeURIComponent(body.ownerName)}&limit=1&offset=0&isArchived=false`,
      headers: { cookie: manager.cookie },
    });
    expect(page.statusCode, page.body).toBe(200);
    expect(page.json()).toMatchObject({ total: 1, limit: 1, offset: 0, items: [{ id: project.id }] });
    for (const url of ['/projects', `/projects/${project.id}`]) {
      expect((await getApp().inject({ url, headers: { cookie: foreman.cookie } })).statusCode).toBe(403);
    }
    expect(
      (await getApp().inject({ url: '/projects?isArchived=anything', headers: { cookie: manager.cookie } })).statusCode,
    ).toBe(400);
    expect(
      (await getApp().inject({ url: '/projects/2147483647', headers: { cookie: manager.cookie } })).statusCode,
    ).toBe(404);
  });

  it('изменяет реквизиты и архив, отклоняет сужение срока за границы этапов', async () => {
    const manager = await createIdentity();
    const project = (await createProject(manager.cookie, payload())).json<Project>();
    let version = project.version;
    const patch = async (body: object) => {
      const response = await getApp().inject({
        method: 'PATCH',
        url: `/projects/${project.id}`,
        headers: { cookie: manager.cookie },
        payload: { expectedVersion: version, ...body },
      });
      if (response.statusCode === 200) version = response.json<Project>().version;
      return response;
    };
    const invalid = await patch({ address: 'Не должно сохраниться', plannedEndDate: '2026-10-20' });
    expect(invalid.statusCode).toBe(400);
    expect((await getApp().db.select().from(projects).where(eq(projects.id, project.id)))[0]!.address).toBe(
      project.address,
    );
    const result = await patch({
      ownerName: 'Новое имя',
      notes: 'Примечание',
      coordinates: { latitude: 50, longitude: 60 },
      isArchived: true,
    });
    expect(result.statusCode, result.body).toBe(200);
    expect(result.json()).toMatchObject({
      ownerName: 'Новое имя',
      notes: 'Примечание',
      coordinates: { latitude: 50, longitude: 60 },
      isArchived: true,
    });
    const search = encodeURIComponent('Новое имя');
    expect(
      (await getApp().inject({ url: `/projects?search=${search}`, headers: { cookie: manager.cookie } })).json().total,
    ).toBe(0);
    expect(
      (
        await getApp().inject({
          url: `/projects?search=${search}&isArchived=true`,
          headers: { cookie: manager.cookie },
        })
      ).json().total,
    ).toBe(1);
    expect((await patch({ isArchived: false })).json()).toMatchObject({ isArchived: false });
    expect((await patch({ notes: null })).json()).toMatchObject({ notes: null });
    for (const body of [{}, { notes: '  ' }, { status: 'completed' }]) expect((await patch(body)).statusCode).toBe(400);
    expect((await auditRecords(getApp().db, manager.user.id, 'updateProject')).events).toHaveLength(3);
  });

  it('завершает объект только после выплаты всех этапов', async () => {
    const manager = await createIdentity();
    const project = (
      await createProject(manager.cookie, payload({ stages: [stage('foundation'), stage('walls')] }))
    ).json<Project>();
    await getApp()
      .db.update(stages)
      .set({ status: 'paid' })
      .where(and(eq(stages.projectId, project.id), eq(stages.stageTypeCode, 'walls')));
    const card = () => getApp().inject({ url: `/projects/${project.id}`, headers: { cookie: manager.cookie } });
    expect((await card()).json().status).toBe('in_progress');
    await getApp().db.update(stages).set({ status: 'paid' }).where(eq(stages.projectId, project.id));
    expect((await card()).json().status).toBe('completed');
  });

  it('создаёт все выбранные этапы и копирует их шаблоны', async () => {
    const manager = await createIdentity();
    const body = payload({ stages: stageTypes.map((type) => stage(type)) });
    const response = await createProject(manager.cookie, body);

    expect(response.statusCode, response.body).toBe(201);
    const project = response.json<Project>();
    expect(project).toMatchObject({
      ownerName: body.ownerName,
      address: body.address,
      coordinates: body.coordinates,
      plannedStartDate: body.plannedStartDate,
      plannedEndDate: body.plannedEndDate,
    });
    const storedStages = await getApp().db.select().from(stages).where(eq(stages.projectId, project.id));
    expect(storedStages).toHaveLength(8);
    expect(storedStages.map((item) => item.position).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    const storedChecklists = await getApp()
      .db.select({ value: count() })
      .from(checklists)
      .where(
        inArray(
          checklists.stageId,
          storedStages.map((item) => item.id),
        ),
      );
    expect(storedChecklists[0]?.value).toBe(8);

    const copiedItems = await getApp()
      .db.select({ title: checklistItems.title })
      .from(checklistItems)
      .innerJoin(checklists, eq(checklists.id, checklistItems.checklistId))
      .where(
        inArray(
          checklists.stageId,
          storedStages.map((item) => item.id),
        ),
      );
    expect(copiedItems).toHaveLength(34);
    expect(copiedItems.filter((item) => item.title === 'Уборка')).toHaveLength(8);

    const audit = await auditRecords(getApp().db, manager.user.id, 'createProject');
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({
      source: 'api',
      actorSnapshot: { login: manager.user.login, fullName: manager.user.fullName, role: 'manager' },
    });
    expect(audit.changes.filter((change) => change.entityType === 'stages')).toHaveLength(8);
    expect(audit.changes.filter((change) => change.entityType === 'checklists')).toHaveLength(8);
    expect(audit.changes.filter((change) => change.entityType === 'checklist_items').length).toBeGreaterThan(8);
    expect(
      audit.changes.every(
        (change) => change.projectId === project.id && change.action === 'create' && change.before === null,
      ),
    ).toBe(true);
    expect(
      audit.changes.filter((change) => change.entityType !== 'projects').every((change) => change.stageId !== null),
    ).toBe(true);
  });

  it('создаёт только выбранные этапы и сохраняет назначение и планы', async () => {
    const manager = await createIdentity();
    const foreman = await createIdentity('foreman');
    const uploadedAt = new Date();
    const storedFiles = await getApp()
      .db.insert(files)
      .values(
        [1, 2].map((position) => ({
          status: 'uploaded' as const,
          purpose: 'project_document' as const,
          storageKey: `tests/projects/${randomUUID()}`,
          originalName: `document-${position}.pdf`,
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          checksumMd5: String(position).repeat(32),
          uploadedByUserId: manager.user.id,
          uploadExpiresAt: uploadedAt,
          uploadedAt,
        })),
      )
      .returning({ id: files.id });
    createdFileIds.push(...storedFiles.map(({ id }) => id));
    const body = payload({
      documentFileIds: storedFiles.map(({ id }) => id),
      stages: [
        stage('walls', {
          assigneeId: foreman.user.id,
          plannedWorkAmountMinor: 50_000_000,
          plannedMaterialAmountMinor: 70_000_000,
        }),
      ],
    });
    const key = randomUUID();
    const response = await createProject(manager.cookie, body, key);
    expect(response.statusCode, response.body).toBe(201);
    const project = response.json<Project>();
    const storedDocuments = await getApp()
      .db.select()
      .from(projectDocuments)
      .where(eq(projectDocuments.projectId, project.id));
    const [storedStage] = await getApp().db.select().from(stages).where(eq(stages.projectId, project.id));
    expect(storedDocuments.map(({ fileId }) => fileId)).toEqual(body.documentFileIds);
    expect(storedStage).toMatchObject({
      stageTypeCode: 'walls',
      assigneeId: foreman.user.id,
      status: 'assigned',
      plannedWorkAmountMinor: 50_000_000,
      plannedMaterialAmountMinor: 70_000_000,
    });
    const repeated = await createProject(manager.cookie, body, key);
    expect(repeated.statusCode, repeated.body).toBe(201);
    expect(repeated.json()).toEqual(project);
    const audit = await auditRecords(getApp().db, manager.user.id, 'createProject');
    expect(audit.events).toHaveLength(1);
    expect(audit.changes.filter(({ entityType }) => entityType === 'project_documents')).toHaveLength(2);
  });

  it('сохраняет индивидуальный список пунктов вместо шаблона', async () => {
    const manager = await createIdentity();
    const templatesBefore = await getApp().db.select().from(checklistTemplateItems);
    const customItems = [
      { title: 'Переименованный пункт', photoHint: null },
      { title: 'Добавленный пункт', photoHint: 'Показать узел крупным планом' },
    ];
    const response = await createProject(
      manager.cookie,
      payload({ stages: [stage('foundation', { checklistItems: customItems })] }),
    );
    const project = response.json<Project>();
    const [storedStage] = await getApp().db.select().from(stages).where(eq(stages.projectId, project.id));
    const [storedChecklist] = await getApp()
      .db.select()
      .from(checklists)
      .where(eq(checklists.stageId, storedStage!.id));
    const storedItems = await getApp()
      .db.select()
      .from(checklistItems)
      .where(eq(checklistItems.checklistId, storedChecklist!.id));
    expect(storedItems.map(({ title, photoHint }) => ({ title, photoHint }))).toEqual(customItems);
    expect(await getApp().db.select().from(checklistTemplateItems)).toEqual(templatesBefore);
  });

  it.each([
    { status: 'pending' as const },
    { mimeType: 'image/png' },
    { sizeBytes: 50_000_000 + 1 },
    { purpose: 'material_invoice' as const },
  ])('не сохраняет объект и вложенные записи с неверным PDF: %j', async (invalidFile) => {
    const manager = await createIdentity();
    const [file] = await getApp()
      .db.insert(files)
      .values({
        status: 'uploaded' as const,
        purpose: 'project_document' as const,
        storageKey: `tests/projects/${randomUUID()}`,
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        checksumMd5: 'a'.repeat(32),
        uploadedByUserId: manager.user.id,
        uploadExpiresAt: new Date(),
        uploadedAt: 'status' in invalidFile ? null : new Date(),
        ...invalidFile,
      })
      .returning();
    createdFileIds.push(file!.id);
    const body = payload({
      documentFileIds: [file!.id],
      stages: [{ type: 'foundation', plannedWorkAmountMinor: 10_000 }],
    });
    const response = await createProject(manager.cookie, body);
    expect(response.statusCode, response.body).toBe(400);
    expect(response.json().details).toContainEqual(expect.objectContaining({ path: 'body.documentFileIds.0' }));
    expect(await getApp().db.select().from(projects).where(eq(projects.ownerName, body.ownerName))).toHaveLength(0);
    expect(await getApp().db.select().from(projectDocuments).where(eq(projectDocuments.fileId, file!.id))).toHaveLength(
      0,
    );
    expect((await auditRecords(getApp().db, manager.user.id, 'createProject')).events).toHaveLength(0);
  });

  it('отклоняет отсутствие этапов, пустой чек-лист и повтор типа', async () => {
    const manager = await createIdentity();
    const noStages = await createProject(manager.cookie, payload({ stages: [] }));
    const emptyChecklist = await createProject(
      manager.cookie,
      payload({ stages: [stage('foundation', { checklistItems: [] })] }),
    );
    const duplicateType = await createProject(
      manager.cookie,
      payload({ stages: [stage('foundation'), stage('foundation')] }),
    );
    expect(noStages.statusCode).toBe(400);
    expect(emptyChecklist.statusCode).toBe(400);
    expect(duplicateType.statusCode).toBe(400);
  });

  it('отклоняет даты этапа вне срока проекта', async () => {
    const manager = await createIdentity();
    const response = await createProject(
      manager.cookie,
      payload({ stages: [stage('foundation', { plannedEndDate: '2027-06-01' })] }),
    );
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'invalid_request' });
  });

  it('разрешает пересекающиеся даты этапов внутри срока проекта', async () => {
    const manager = await createIdentity();
    const response = await createProject(
      manager.cookie,
      payload({
        stages: [
          stage('foundation', { plannedStartDate: '2026-10-05', plannedEndDate: '2026-11-15' }),
          stage('walls', { plannedStartDate: '2026-10-20', plannedEndDate: '2026-12-01' }),
        ],
      }),
    );

    expect(response.statusCode, response.body).toBe(201);
  });

  it('отклоняет неактивного пользователя и пользователя не с ролью foreman', async () => {
    const manager = await createIdentity();
    const inactiveForeman = await createIdentity('foreman', false);
    const wrongRole = await createProject(
      manager.cookie,
      payload({ stages: [stage('foundation', { assigneeId: manager.user.id })] }),
    );
    const inactive = await createProject(
      manager.cookie,
      payload({ stages: [stage('foundation', { assigneeId: inactiveForeman.user.id })] }),
    );
    expect(wrongRole.statusCode).toBe(400);
    expect(inactive.statusCode).toBe(400);
  });

  it('создаёт разные объекты при разных ключах идемпотентности', async () => {
    const manager = await createIdentity();
    const body = payload();
    const first = await createProject(manager.cookie, body);
    const repeated = await createProject(manager.cookie, body);
    expect(first.statusCode).toBe(201);
    expect(repeated.statusCode).toBe(201);
    expect(repeated.json<Project>().id).not.toBe(first.json<Project>().id);
    const rows = await getApp()
      .db.select({ value: count() })
      .from(projects)
      .where(eq(projects.ownerName, body.ownerName));
    expect(rows[0]?.value).toBe(2);
  });

  it('не сохраняет проект, если один из этапов не прошёл проверку', async () => {
    const manager = await createIdentity();
    const inactiveForeman = await createIdentity('foreman', false);
    const body = payload({
      stages: [stage('foundation'), stage('walls', { assigneeId: inactiveForeman.user.id })],
    });
    const response = await createProject(manager.cookie, body);
    expect(response.statusCode).toBe(400);
    const rows = await getApp()
      .db.select({ value: count() })
      .from(projects)
      .where(eq(projects.ownerName, body.ownerName));
    expect(rows[0]?.value).toBe(0);
  });
});
