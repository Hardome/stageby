import { randomUUID } from 'node:crypto';

import fastifyCookie from '@fastify/cookie';
import { and, count, eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { parseEnvironment } from '#app/config/env';
import { checklistItems, checklists } from '#app/db/schema/checklists';
import { files, projectDocuments } from '#app/db/schema/files';
import { projects } from '#app/db/schema/projects';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import type { CreateProject, Project, StageType } from '#app/generated/types.gen';
import { hashPassword } from '#app/modules/auth/password-hasher';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { projectModule } from '#app/modules/projects/index';
import { UserRepository } from '#app/modules/users/repository';
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

describe('Composite project creation', () => {
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
    const patch = (body: object) =>
      getApp().inject({
        method: 'PATCH',
        url: `/projects/${project.id}`,
        headers: { cookie: manager.cookie },
        payload: body,
      });
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
    expect((await patch({ notes: null, isArchived: false })).json()).toMatchObject({ notes: null, isArchived: false });
    for (const body of [{}, { notes: '  ' }, { status: 'completed' }]) expect((await patch(body)).statusCode).toBe(400);
    expect((await auditRecords(getApp().db, manager.user.id, 'updateProject')).events).toHaveLength(2);
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
          checksumSha256: String(position).repeat(64),
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
    const response = await createProject(manager.cookie, body);
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
  });

  it('сохраняет индивидуальный список пунктов вместо шаблона', async () => {
    const manager = await createIdentity();
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
