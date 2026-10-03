import { randomUUID } from 'node:crypto';

import fastifyCookie from '@fastify/cookie';
import { eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { parseEnvironment } from '#app/config/env';
import { checklists } from '#app/db/schema/checklists';
import { projects } from '#app/db/schema/projects';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import type { Project, Stage, WorkPayment } from '#app/generated/types.gen';
import { hashPassword } from '#app/modules/auth/password-hasher';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { projectModule } from '#app/modules/projects/index';
import { stageModule } from '#app/modules/stages/index';
import { UserRepository } from '#app/modules/users/repository';
import { workPaymentModule } from '#app/modules/work-payments/index';
import { registerAuthentication } from '#app/plugins/authentication';
import { registerErrorHandler } from '#app/plugins/error-handler';
import { auditRecords } from '#test/audit-records';
import { setupModuleTest } from '#test/setup-module-test';

const PASSWORD = 'ValidPass123!';
const createdProjectIds: number[] = [];
const createdUserIds: number[] = [];
let passwordHash: string;

const testModule: FastifyPluginAsync = async (app) => {
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
};

const getApp = setupModuleTest(testModule);

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

afterEach(async () => {
  if (createdProjectIds.length > 0) {
    await getApp().db.delete(projects).where(inArray(projects.id, createdProjectIds));
    createdProjectIds.length = 0;
  }
  if (createdUserIds.length > 0) {
    await getApp().db.delete(users).where(inArray(users.id, createdUserIds));
    createdUserIds.length = 0;
  }
});

async function createIdentity(role: 'manager' | 'foreman') {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 20);
  const user = await new UserRepository(getApp().db).create({
    login: `payments.${suffix}`,
    passwordHash,
    fullName: `Пользователь ${suffix}`,
    role,
  });
  createdUserIds.push(user.id);
  const session = await new SessionService(new SessionRepository(getApp().db), 12).issue(user.id);
  return { user, cookie: `stageby_session=${session.accessToken}` };
}

async function createFixture(plannedWorkAmountMinor: number | null = 10_000) {
  const manager = await createIdentity('manager');
  const foreman = await createIdentity('foreman');
  const response = await getApp().inject({
    method: 'POST',
    url: '/projects',
    headers: { cookie: manager.cookie },
    payload: {
      ownerName: `Клиент ${randomUUID()}`,
      address: 'Екатеринбург, ул. Платёжная, 1',
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
          plannedWorkAmountMinor,
          plannedMaterialAmountMinor: null,
          checklistItems: [{ title: 'Пункт' }],
        },
      ],
    },
  });
  if (response.statusCode !== 201) throw new Error(`Не удалось создать тестовый проект: ${response.body}`);
  const project = response.json<Project>();
  createdProjectIds.push(project.id);
  const [stage] = await getApp().db.select().from(stages).where(eq(stages.projectId, project.id));
  const [checklist] = await getApp().db.select().from(checklists).where(eq(checklists.stageId, stage!.id));
  return { manager, foreman, project, stage: stage!, checklist: checklist! };
}

describe('Оплата работ', () => {
  it('создаёт частичные платежи, показывает переплату и поддерживает изменение и удаление', async () => {
    const fixture = await createFixture();
    const invalid = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
      payload: { paidAt: '2026-10-01', amountMinor: 150 },
    });
    expect(invalid.statusCode).toBe(400);

    const firstResponse = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
      payload: { paidAt: '2026-10-01', amountMinor: 4000, comment: ' Аванс ' },
    });
    expect(firstResponse.statusCode, firstResponse.body).toBe(201);
    const first = firstResponse.json<WorkPayment>();
    expect(first).toMatchObject({ amountMinor: 4000, comment: 'Аванс', version: 1 });

    const secondResponse = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
      payload: { paidAt: '2026-10-02', amountMinor: 7000 },
    });
    expect(secondResponse.statusCode, secondResponse.body).toBe(201);
    const second = secondResponse.json<WorkPayment>();

    const stageResponse = await getApp().inject({
      method: 'GET',
      url: `/stages/${fixture.stage.id}`,
      headers: { cookie: fixture.manager.cookie },
    });
    expect(stageResponse.json<Stage>()).toMatchObject({
      actualWorkAmountMinor: 11_000,
      workBalanceAmountMinor: -1000,
    });

    const list = await getApp().inject({
      method: 'GET',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
    });
    expect(list.json<WorkPayment[]>().map(({ id }) => id)).toEqual([second.id, first.id]);

    const [update, conflict] = await Promise.all([
      getApp().inject({
        method: 'PATCH',
        url: `/work-payments/${first.id}`,
        headers: { cookie: fixture.manager.cookie },
        payload: { expectedVersion: 1, amountMinor: 3000 },
      }),
      getApp().inject({
        method: 'PATCH',
        url: `/work-payments/${first.id}`,
        headers: { cookie: fixture.manager.cookie },
        payload: { expectedVersion: 1, comment: 'Конкурентное изменение' },
      }),
    ]);
    expect([update.statusCode, conflict.statusCode].sort()).toEqual([200, 409]);

    const current = await getApp().inject({
      method: 'GET',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
    });
    const currentFirst = current.json<WorkPayment[]>().find(({ id }) => id === first.id)!;
    const deleted = await getApp().inject({
      method: 'DELETE',
      url: `/work-payments/${first.id}`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: currentFirst.version },
    });
    expect(deleted.statusCode, deleted.body).toBe(204);

    const updates = await auditRecords(getApp().db, fixture.manager.user.id, 'updateWorkPayment');
    expect(updates.events).toHaveLength(1);
    const audit = await auditRecords(getApp().db, fixture.manager.user.id, 'deleteWorkPayment');
    expect(audit.events).toHaveLength(1);
    expect(audit.changes).toHaveLength(1);
    expect(audit.changes[0]).toMatchObject({
      entityType: 'work_payments',
      entityKey: { id: first.id },
      stageId: fixture.stage.id,
      projectId: fixture.project.id,
      action: 'delete',
      before: { version: currentFirst.version },
      after: null,
    });
  });

  it('оставляет мастеру агрегаты своего этапа, но запрещает список и изменение финансов', async () => {
    const fixture = await createFixture(null);
    const otherForeman = await createIdentity('foreman');
    const payment = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
      payload: { paidAt: '2026-10-01', amountMinor: 5000 },
    });
    expect(payment.statusCode, payment.body).toBe(201);

    const ownStage = await getApp().inject({
      method: 'GET',
      url: `/stages/${fixture.stage.id}`,
      headers: { cookie: fixture.foreman.cookie },
    });
    expect(ownStage.statusCode, ownStage.body).toBe(200);
    expect(ownStage.json<Stage>()).toMatchObject({
      actualWorkAmountMinor: 5000,
      workBalanceAmountMinor: null,
    });
    const foreignStage = await getApp().inject({
      method: 'GET',
      url: `/stages/${fixture.stage.id}`,
      headers: { cookie: otherForeman.cookie },
    });
    expect(foreignStage.statusCode).toBe(404);

    const forbiddenList = await getApp().inject({
      method: 'GET',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.foreman.cookie },
    });
    const forbiddenPlan = await getApp().inject({
      method: 'PATCH',
      url: `/stages/${fixture.stage.id}`,
      headers: { cookie: fixture.foreman.cookie },
      payload: { expectedVersion: fixture.stage.version, plannedWorkAmountMinor: 10_000 },
    });
    expect(forbiddenList.statusCode).toBe(403);
    expect(forbiddenPlan.statusCode).toBe(403);

    const plan = await getApp().inject({
      method: 'PATCH',
      url: `/stages/${fixture.stage.id}`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: fixture.stage.version, plannedWorkAmountMinor: 10_000 },
    });
    expect(plan.statusCode, plan.body).toBe(200);
    expect(plan.json<Stage>()).toMatchObject({
      plannedWorkAmountMinor: 10_000,
      actualWorkAmountMinor: 5000,
      workBalanceAmountMinor: 5000,
    });
  });

  it('переводит завершённый этап в paid только при точном нулевом остатке', async () => {
    const fixture = await createFixture();
    await getApp().db.update(stages).set({ status: 'completed' }).where(eq(stages.id, fixture.stage.id));
    await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
      payload: { paidAt: '2026-10-01', amountMinor: 10_000 },
    });
    const paid = await getApp().inject({
      method: 'PUT',
      url: `/stages/${fixture.stage.id}/status`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: fixture.stage.version, status: 'paid' },
    });
    expect(paid.statusCode, paid.body).toBe(200);
    expect(paid.json<Stage>().status).toBe('paid');
  });
});
