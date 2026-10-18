import { randomUUID } from 'node:crypto';

import fastifyCookie from '@fastify/cookie';
import { eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { parseEnvironment } from '#app/config/env';
import { checklistItems, checklists } from '#app/db/schema/checklists';
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
    headers: { cookie: manager.cookie, 'idempotency-key': randomUUID() },
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

type Fixture = Awaited<ReturnType<typeof createFixture>>;

async function pay(fixture: Fixture, amountMinor = 10_000) {
  return getApp().inject({
    method: 'POST',
    url: `/stages/${fixture.stage.id}/work-payments`,
    headers: { cookie: fixture.manager.cookie },
    payload: { amountMinor, paidAt: '2026-10-04', comment: ' Аванс ' },
  });
}

async function current(fixture: Fixture) {
  const response = await getApp().inject({
    url: `/stages/${fixture.stage.id}`,
    headers: { cookie: fixture.manager.cookie },
  });
  if (response.statusCode !== 200) throw new Error(response.body);
  return response.json<Stage>();
}

async function accept(fixture: Fixture) {
  await getApp()
    .db.update(checklistItems)
    .set({ isCompleted: true, completedAt: new Date(), completedByUserId: fixture.foreman.user.id })
    .where(eq(checklistItems.checklistId, fixture.checklist.id));
  await getApp().db.update(stages).set({ status: 'acceptance' }).where(eq(stages.id, fixture.stage.id));
  const stage = await current(fixture);
  const response = await getApp().inject({
    method: 'POST',
    url: `/stages/${stage.id}/acceptance`,
    headers: { cookie: fixture.manager.cookie },
    payload: { expectedVersion: stage.version },
  });
  if (response.statusCode !== 200) throw new Error(response.body);
  return response.json<Stage>();
}

describe('Фактические выплаты этапа', () => {
  it('фиксирует назначенного мастера, сумму, дату, автора и комментарий без строки плана', async () => {
    const fixture = await createFixture();
    const response = await pay(fixture, 4000);
    expect(response.statusCode, response.body).toBe(201);
    expect(response.json()).toMatchObject({
      stageId: fixture.stage.id,
      recipient: { id: fixture.foreman.user.id },
      createdBy: { id: fixture.manager.user.id },
      amountMinor: 4000,
      comment: 'Аванс',
      version: 1,
    });
    expect(response.json()).not.toHaveProperty('workPlanRowId');
    expect(await current(fixture)).toMatchObject({
      status: 'assigned',
      plannedWorkAmountMinor: 10_000,
      actualWorkAmountMinor: 4000,
    });
  });

  it.each([null, false])('запрещает новую выплату без активного назначения: %s', async (assignment) => {
    const fixture = await createFixture();
    if (assignment === null)
      await getApp().db.update(stages).set({ assigneeId: null }).where(eq(stages.id, fixture.stage.id));
    else await getApp().db.update(users).set({ isActive: false }).where(eq(users.id, fixture.foreman.user.id));
    expect((await pay(fixture)).statusCode).toBe(400);
    expect((await current(fixture)).actualWorkAmountMinor).toBe(0);
  });

  it('новые выплаты используют новое назначение, прежний получатель не меняется', async () => {
    const fixture = await createFixture();
    const first = await pay(fixture, 4000);
    const next = await createIdentity('foreman');
    const response = await getApp().inject({
      method: 'PATCH',
      url: `/stages/${fixture.stage.id}`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: 1, assigneeId: next.user.id },
    });
    expect(response.statusCode, response.body).toBe(200);
    const second = await pay(fixture, 6000);
    expect(second.json().recipient.id).toBe(next.user.id);
    const url = `/work-payments/${first.json().id}`;
    expect(
      (
        await getApp().inject({
          method: 'PATCH',
          url,
          headers: { cookie: fixture.manager.cookie },
          payload: { expectedVersion: 1, recipientId: next.user.id },
        })
      ).statusCode,
    ).toBe(400);
    const list = await getApp().inject({
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: next.cookie },
    });
    expect(list.json<WorkPayment[]>().map((item) => item.id)).toEqual([second.json().id]);
    const managerList = await getApp().inject({
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
    });
    expect(managerList.json<WorkPayment[]>().find((item) => item.id === first.json().id)?.recipient.id).toBe(
      fixture.foreman.user.id,
    );
    expect((await accept(fixture)).status).toBe('paid');
  });

  it.each([9000, 10_000, 12_000])('после приёмки автоматически считает статус при факте %i', async (amount) => {
    const fixture = await createFixture();
    expect((await accept(fixture)).status).toBe('completed');
    expect((await pay(fixture, amount)).statusCode).toBe(201);
    expect(await current(fixture)).toMatchObject({
      status: amount >= 10_000 ? 'paid' : 'completed',
      actualWorkAmountMinor: amount,
    });
  });

  it.each([null, 0, 10_000])('предоплата и план %s учитываются только после приёмки', async (plan) => {
    const fixture = await createFixture(plan);
    if (plan !== 0) await pay(fixture);
    expect((await current(fixture)).status).toBe('assigned');
    expect((await accept(fixture)).status).toBe(plan === null ? 'completed' : 'paid');
  });

  it('исправление и удаление выплаты пересчитывают статус и сохраняют дату приёмки', async () => {
    const fixture = await createFixture();
    await accept(fixture);
    const payment = (await pay(fixture)).json<WorkPayment>();
    const paid = await current(fixture);
    const url = `/work-payments/${payment.id}`;
    const patch = (expectedVersion: number, amountMinor: number) =>
      getApp().inject({
        method: 'PATCH',
        url,
        headers: { cookie: fixture.manager.cookie },
        payload: { expectedVersion, amountMinor },
      });
    expect((await patch(1, 9000)).statusCode).toBe(200);
    expect(await current(fixture)).toMatchObject({
      status: 'completed',
      actualEndDate: paid.actualEndDate,
      version: paid.version + 1,
    });
    expect((await patch(1, 10_000)).statusCode).toBe(409);
    expect((await patch(2, 12_000)).statusCode).toBe(200);
    expect((await current(fixture)).status).toBe('paid');
    expect(
      (
        await getApp().inject({
          method: 'DELETE',
          url,
          headers: { cookie: fixture.manager.cookie },
          payload: { expectedVersion: 3 },
        })
      ).statusCode,
    ).toBe(204);
    expect(await current(fixture)).toMatchObject({
      status: 'completed',
      actualWorkAmountMinor: 0,
      actualEndDate: paid.actualEndDate,
    });
    const audit = await auditRecords(getApp().db, fixture.manager.user.id, 'deleteWorkPayment');
    expect(new Set(audit.changes.map((item) => item.entityType))).toEqual(new Set(['work_payments', 'stages']));
  });

  it.each([null, 11_000, 0])('изменение ручного плана на %s пересчитывает статус один раз', async (plan) => {
    const fixture = await createFixture();
    await accept(fixture);
    await pay(fixture);
    const paid = await current(fixture);
    const response = await getApp().inject({
      method: 'PATCH',
      url: `/stages/${paid.id}`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: paid.version, plannedWorkAmountMinor: plan },
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toMatchObject({
      status: plan === 0 ? 'paid' : 'completed',
      version: paid.version + 1,
      actualEndDate: paid.actualEndDate,
    });
  });

  it('согласует конкурентное изменение плана и выплаты', async () => {
    const fixture = await createFixture();
    await accept(fixture);
    const payment = (await pay(fixture, 12_000)).json<WorkPayment>();
    const stage = await current(fixture);
    const responses = await Promise.all([
      getApp().inject({
        method: 'PATCH',
        url: `/stages/${stage.id}`,
        headers: { cookie: fixture.manager.cookie },
        payload: { expectedVersion: stage.version, plannedWorkAmountMinor: 13_000 },
      }),
      getApp().inject({
        method: 'PATCH',
        url: `/work-payments/${payment.id}`,
        headers: { cookie: fixture.manager.cookie },
        payload: { expectedVersion: payment.version, amountMinor: 9000 },
      }),
    ]);
    expect(responses[1]!.statusCode).toBe(200);
    expect([200, 409]).toContain(responses[0]!.statusCode);
    expect(await current(fixture)).toMatchObject({
      status: 'completed',
      plannedWorkAmountMinor: responses[0]!.statusCode === 200 ? 13_000 : 10_000,
      actualWorkAmountMinor: 9000,
    });
  });

  it('согласует создание выплаты с переназначением мастера', async () => {
    const fixture = await createFixture();
    const next = await createIdentity('foreman');
    const [assignment, payment] = await Promise.all([
      getApp().inject({
        method: 'PATCH',
        url: `/stages/${fixture.stage.id}`,
        headers: { cookie: fixture.manager.cookie },
        payload: { expectedVersion: 1, assigneeId: next.user.id },
      }),
      pay(fixture),
    ]);
    expect(assignment.statusCode).toBe(200);
    expect(payment.statusCode).toBe(201);
    expect([fixture.foreman.user.id, next.user.id]).toContain(payment.json().recipient.id);
    expect((await pay(fixture)).json().recipient.id).toBe(next.user.id);
  });

  it('защищает права, архив, версии и отклоняет старые поля и ручной paid', async () => {
    const fixture = await createFixture();
    const url = `/stages/${fixture.stage.id}/work-payments`;
    for (const [cookie, status] of [
      ['', 401],
      [fixture.foreman.cookie, 403],
    ] as const)
      expect(
        (
          await getApp().inject({
            method: 'POST',
            url,
            headers: { cookie },
            payload: { amountMinor: 1000, paidAt: '2026-10-04' },
          })
        ).statusCode,
      ).toBe(status);
    for (const amountMinor of [0, -100, 150]) expect((await pay(fixture, amountMinor)).statusCode).toBe(400);
    expect(
      (
        await getApp().inject({
          method: 'POST',
          url,
          headers: { cookie: fixture.manager.cookie },
          payload: { amountMinor: 1000, paidAt: '2026-10-04', workPlanRowId: 1 },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await getApp().inject({
          method: 'PUT',
          url: `/stages/${fixture.stage.id}/status`,
          headers: { cookie: fixture.manager.cookie },
          payload: { expectedVersion: 1, status: 'paid' },
        })
      ).statusCode,
    ).toBe(400);
    await getApp().db.update(projects).set({ isArchived: true }).where(eq(projects.id, fixture.project.id));
    expect((await pay(fixture)).statusCode).toBe(409);
  });
});
