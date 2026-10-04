import { randomUUID } from 'node:crypto';

import fastifyCookie from '@fastify/cookie';
import { count, eq, inArray } from 'drizzle-orm';
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

async function createIdentity(role: 'manager' | 'foreman' | 'estimator' = 'manager', isActive = true) {
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
    canRunInParallel: false,
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

async function createProject(cookie: string, body: CreateProject) {
  const response = await getApp().inject({
    method: 'POST',
    url: '/projects',
    headers: { cookie },
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

  it('создаёт только выбранные этапы и сохраняет назначение, параллельность и планы', async () => {
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
          canRunInParallel: true,
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
      canRunInParallel: true,
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

  it('отклоняет неактивного пользователя и пользователя не с ролью foreman', async () => {
    const manager = await createIdentity();
    const estimator = await createIdentity('estimator');
    const inactiveForeman = await createIdentity('foreman', false);
    const wrongRole = await createProject(
      manager.cookie,
      payload({ stages: [stage('foundation', { assigneeId: estimator.user.id })] }),
    );
    const inactive = await createProject(
      manager.cookie,
      payload({ stages: [stage('foundation', { assigneeId: inactiveForeman.user.id })] }),
    );
    expect(wrongRole.statusCode).toBe(400);
    expect(inactive.statusCode).toBe(400);
  });

  it('считает повторную отправку новым созданием проекта', async () => {
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
