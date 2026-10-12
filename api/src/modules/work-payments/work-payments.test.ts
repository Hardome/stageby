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
import { workPlanRows } from '#app/db/schema/work-plan-rows';
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
import { createPaymentPlanRow } from '#test/work-plan-row';

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
  const [initialRow] = await getApp().db.select().from(workPlanRows).where(eq(workPlanRows.stageId, stage!.id));
  const planRow = initialRow ?? (await createPaymentPlanRow(getApp().db, stage!.id, foreman.user.id));
  await getApp().db.update(workPlanRows).set({ recipientId: foreman.user.id }).where(eq(workPlanRows.id, planRow.id));
  return { manager, foreman, project, stage: stage!, checklist: checklist!, planRow };
}

describe('Оплата работ', () => {
  it('защищает paid при конкурентном увеличении плана и уменьшении выплаты', async () => {
    const fixture = await createFixture();
    const payment = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
      payload: { workPlanRowId: fixture.planRow.id, amountMinor: 12_000, paidAt: '2026-10-04' },
    });
    expect(payment.statusCode, payment.body).toBe(201);
    await getApp().db.update(stages).set({ status: 'paid' }).where(eq(stages.id, fixture.stage.id));
    const responses = await Promise.all([
      getApp().inject({
        method: 'PATCH',
        url: `/stages/${fixture.stage.id}`,
        headers: { cookie: fixture.manager.cookie },
        payload: { expectedVersion: 1, plannedWorkAmountMinor: 12_000 },
      }),
      getApp().inject({
        method: 'PATCH',
        url: `/work-payments/${payment.json().id}`,
        headers: { cookie: fixture.manager.cookie },
        payload: { expectedVersion: 1, amountMinor: 10_000 },
      }),
    ]);
    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 409]);
    const current = await getApp().inject({
      method: 'GET',
      url: `/stages/${fixture.stage.id}`,
      headers: { cookie: fixture.manager.cookie },
    });
    expect(current.json().status).toBe('paid');
    expect(current.json<Stage>().workBalanceAmountMinor).toBeLessThanOrEqual(0);
  });

  it('разрешает изменение строк только руководителю и проверяет версии', async () => {
    const fixture = await createFixture();
    const foreign = await createIdentity('foreman');
    const url = `/work-plan-rows/${fixture.planRow.id}`;
    expect((await getApp().inject({ method: 'GET', url })).statusCode).toBe(401);
    expect((await getApp().inject({ method: 'GET', url, headers: { cookie: foreign.cookie } })).statusCode).toBe(404);
    for (const method of ['PATCH', 'DELETE'] as const) {
      expect(
        (
          await getApp().inject({
            method,
            url,
            headers: { cookie: fixture.foreman.cookie },
            payload: { expectedVersion: 1, ...(method === 'PATCH' ? { dueDate: null } : {}) },
          })
        ).statusCode,
      ).toBe(403);
    }
    expect(
      (
        await getApp().inject({
          method: 'PATCH',
          url,
          headers: { cookie: fixture.manager.cookie },
          payload: { expectedVersion: 2, dueDate: null },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await getApp().inject({
          method: 'PATCH',
          url,
          headers: { cookie: fixture.manager.cookie },
          payload: { expectedVersion: 1 },
        })
      ).statusCode,
    ).toBe(400);
    expect((await auditRecords(getApp().db, fixture.manager.user.id, 'updateWorkPlanRow')).events).toHaveLength(0);
  });

  it('создаёт нераспределённый план при создании этапа, различает null и ноль', async () => {
    for (const plannedWorkAmountMinor of [null, 0, 10_000]) {
      const fixture = await createFixture(plannedWorkAmountMinor);
      // The fixture creates a payable row for other tests; verify the creation audit itself.
      const audit = await auditRecords(getApp().db, fixture.manager.user.id, 'createProject');
      const rows = audit.changes.filter((change) => change.entityType === 'work_plan_rows');
      expect(rows).toHaveLength(plannedWorkAmountMinor === null ? 0 : 1);
      expect(rows.map((row) => row.after)).toMatchObject(
        plannedWorkAmountMinor === null
          ? []
          : [
              {
                amountMinor: plannedWorkAmountMinor,
                recipientId: null,
                dueDate: null,
                stageId: fixture.stage.id,
              },
            ],
      );
    }
  });

  it('распределяет строку атомарно, сохраняет аудит и ручной план этапа', async () => {
    const fixture = await createFixture();
    const created = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/work-plan-rows`,
      headers: { cookie: fixture.manager.cookie },
      payload: { amountMinor: 10_000 },
    });
    expect(created.statusCode, created.body).toBe(201);
    const row = created.json();
    const distribute = (rows: unknown[]) =>
      getApp().inject({
        method: 'POST',
        url: `/work-plan-rows/${row.id}/distribute`,
        headers: { cookie: fixture.manager.cookie },
        payload: { expectedVersion: 1, rows },
      });
    const invalid = await distribute([{ amountMinor: 6000 }, { amountMinor: 3000 }]);
    expect(invalid.statusCode).toBe(400);
    expect((await auditRecords(getApp().db, fixture.manager.user.id, 'distributeWorkPlanRow')).events).toHaveLength(0);
    const responses = await Promise.all([
      distribute([
        { amountMinor: 6000, recipientId: fixture.foreman.user.id },
        { amountMinor: 4000, dueDate: '2030-01-01' },
      ]),
      distribute([{ amountMinor: 5000 }, { amountMinor: 5000 }]),
    ]);
    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 404]);
    const success = responses.find((response) => response.statusCode === 200)!;
    expect(success.json().reduce((total: number, item: { amountMinor: number }) => total + item.amountMinor, 0)).toBe(
      10_000,
    );
    expect(await getApp().db.select().from(workPlanRows).where(eq(workPlanRows.id, row.id))).toHaveLength(0);
    const audit = await auditRecords(getApp().db, fixture.manager.user.id, 'distributeWorkPlanRow');
    expect(audit.events).toHaveLength(1);
    expect(audit.changes.filter((change) => change.action === 'create')).toHaveLength(2);
    expect(audit.changes.find((change) => change.action === 'delete')).toMatchObject({
      entityKey: { id: row.id },
      before: { amountMinor: 10_000 },
      after: null,
    });
    expect(
      (
        await getApp().inject({ url: `/stages/${fixture.stage.id}`, headers: { cookie: fixture.manager.cookie } })
      ).json().plannedWorkAmountMinor,
    ).toBe(10_000);
  });

  it('меняет и очищает получателя без изменения прошлых выплат, фильтрует собственную детализацию', async () => {
    const fixture = await createFixture();
    const other = await createIdentity('foreman');
    const pay = () =>
      getApp().inject({
        method: 'POST',
        url: `/stages/${fixture.stage.id}/work-payments`,
        headers: { cookie: fixture.manager.cookie },
        payload: { workPlanRowId: fixture.planRow.id, amountMinor: 1000, paidAt: '2030-01-01' },
      });
    expect((await pay()).statusCode).toBe(201);
    const update = (recipientId: number | null, expectedVersion: number) =>
      getApp().inject({
        method: 'PATCH',
        url: `/work-plan-rows/${fixture.planRow.id}`,
        headers: { cookie: fixture.manager.cookie },
        payload: { recipientId, expectedVersion, dueDate: null },
      });
    expect((await update(other.user.id, 1)).statusCode).toBe(200);
    expect((await update(null, 1)).statusCode).toBe(409);
    expect((await pay()).json().recipient.id).toBe(other.user.id);
    const ownRows = await getApp().inject({
      url: `/stages/${fixture.stage.id}/work-plan-rows`,
      headers: { cookie: fixture.foreman.cookie },
    });
    expect(ownRows.statusCode, ownRows.body).toBe(200);
    expect(ownRows.json()).toEqual([]);
    const ownPayments = await getApp().inject({
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.foreman.cookie },
    });
    expect(ownPayments.json()).toHaveLength(1);
    expect(ownPayments.json()[0].recipient.id).toBe(fixture.foreman.user.id);
    expect(
      (
        await getApp().inject({
          url: `/work-plan-rows/${fixture.planRow.id}`,
          headers: { cookie: fixture.foreman.cookie },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await getApp().inject({
          method: 'DELETE',
          url: `/work-plan-rows/${fixture.planRow.id}`,
          headers: { cookie: fixture.manager.cookie },
          payload: { expectedVersion: 2 },
        })
      ).statusCode,
    ).toBe(409);
    expect((await update(null, 2)).statusCode).toBe(200);
    expect((await pay()).statusCode).toBe(400);
    expect(
      (
        await getApp().inject({ url: `/stages/${fixture.stage.id}`, headers: { cookie: fixture.foreman.cookie } })
      ).json(),
    ).toMatchObject({ plannedWorkAmountMinor: 10_000, actualWorkAmountMinor: 2000 });
    await getApp().db.update(stages).set({ assigneeId: other.user.id }).where(eq(stages.id, fixture.stage.id));
    expect(
      (
        await getApp().inject({
          url: `/stages/${fixture.stage.id}/work-payments`,
          headers: { cookie: fixture.foreman.cookie },
        })
      ).statusCode,
    ).toBe(404);
  });

  it('проверяет принадлежность строки этапу и активность текущего получателя', async () => {
    const fixture = await createFixture();
    const other = await createFixture();
    const pay = (workPlanRowId: number) =>
      getApp().inject({
        method: 'POST',
        url: `/stages/${fixture.stage.id}/work-payments`,
        headers: { cookie: fixture.manager.cookie },
        payload: { workPlanRowId, paidAt: '2026-10-04', amountMinor: 1000 },
      });
    expect((await pay(other.planRow.id)).statusCode).toBe(404);
    await getApp().db.update(users).set({ isActive: false }).where(eq(users.id, fixture.foreman.user.id));
    expect((await pay(fixture.planRow.id)).statusCode).toBe(400);
    expect((await auditRecords(getApp().db, fixture.manager.user.id, 'createWorkPayment')).events).toHaveLength(0);
  });

  it('сохраняет paid при допустимых правках и блокирует нарушения без записи аудита', async () => {
    const fixture = await createFixture();
    const payment = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
      payload: { workPlanRowId: fixture.planRow.id, amountMinor: 12_000, paidAt: '2026-10-04' },
    });
    expect(payment.statusCode, payment.body).toBe(201);
    await getApp()
      .db.update(stages)
      .set({ status: 'paid', actualStartDate: '2026-10-02', actualEndDate: '2026-10-03' })
      .where(eq(stages.id, fixture.stage.id));
    const patchStage = (fields: object) =>
      getApp().inject({
        method: 'PATCH',
        url: `/stages/${fixture.stage.id}`,
        headers: { cookie: fixture.manager.cookie },
        payload: { expectedVersion: 1, ...fields },
      });
    expect((await patchStage({ plannedWorkAmountMinor: 13_000 })).statusCode).toBe(409);
    expect((await patchStage({ plannedWorkAmountMinor: null })).statusCode).toBe(409);
    expect(
      (
        await getApp().inject({
          method: 'PATCH',
          url: `/work-payments/${payment.json().id}`,
          headers: { cookie: fixture.manager.cookie },
          payload: { expectedVersion: 1, amountMinor: 9000 },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await getApp().inject({
          method: 'DELETE',
          url: `/work-payments/${payment.json().id}`,
          headers: { cookie: fixture.manager.cookie },
          payload: { expectedVersion: 1 },
        })
      ).statusCode,
    ).toBe(409);
    expect((await auditRecords(getApp().db, fixture.manager.user.id, 'updateStage')).events).toHaveLength(0);
    const allowed = await patchStage({
      plannedWorkAmountMinor: 11_000,
      plannedStartDate: null,
      plannedEndDate: null,
      plannedMaterialAmountMinor: 1000,
    });
    expect(allowed.statusCode, allowed.body).toBe(200);
    expect(allowed.json()).toMatchObject({
      status: 'paid',
      actualStartDate: '2026-10-02',
      actualEndDate: '2026-10-03',
      plannedStartDate: null,
      plannedEndDate: null,
      plannedWorkAmountMinor: 11_000,
    });
  });

  it('сохраняет получателей при замене мастера и суммирует выплаты разным мастерам', async () => {
    const fixture = await createFixture();
    const replacement = await createIdentity('foreman');
    for (const [recipientId, amountMinor] of [
      [fixture.foreman.user.id, 4000],
      [replacement.user.id, 6000],
    ]) {
      const row = await createPaymentPlanRow(getApp().db, fixture.stage.id, recipientId!);
      const response = await getApp().inject({
        method: 'POST',
        url: `/stages/${fixture.stage.id}/work-payments`,
        headers: { cookie: fixture.manager.cookie },
        payload: { workPlanRowId: row.id, amountMinor, paidAt: '2026-10-04' },
      });
      expect(response.statusCode, response.body).toBe(201);
      expect(response.json().recipient.id).toBe(recipientId);
    }
    const reassigned = await getApp().inject({
      method: 'PATCH',
      url: `/stages/${fixture.stage.id}`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: 1, assigneeId: replacement.user.id },
    });
    expect(reassigned.statusCode, reassigned.body).toBe(200);
    expect(reassigned.json()).toMatchObject({ actualWorkAmountMinor: 10_000, workBalanceAmountMinor: 0 });
    const list = await getApp().inject({
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
    });
    const payments = list.json<WorkPayment[]>();
    expect(payments.map((payment) => payment.recipient!.id).sort((a, b) => a - b)).toEqual([
      fixture.foreman.user.id,
      replacement.user.id,
    ]);
    const audit = await auditRecords(getApp().db, fixture.manager.user.id, 'createWorkPayment');
    expect(audit.changes.map((change) => change.after!.recipientId).sort()).toEqual(
      [fixture.foreman.user.id, replacement.user.id].sort(),
    );
    const updated = await getApp().inject({
      method: 'PATCH',
      url: `/work-payments/${payments[0]!.id}`,
      headers: { cookie: fixture.manager.cookie },
      payload: { expectedVersion: 1, recipientId: fixture.foreman.user.id },
    });
    expect(updated.statusCode, updated.body).toBe(200);
    expect(updated.json().recipient.id).toBe(fixture.foreman.user.id);
  });

  it('требует активного получателя с ролью мастера, отклоняет неизвестные поля без аудита', async () => {
    const fixture = await createFixture();
    const inactive = await createIdentity('foreman');
    await getApp().db.update(users).set({ isActive: false }).where(eq(users.id, inactive.user.id));
    for (const extra of [
      {},
      { recipientId: fixture.manager.user.id },
      { recipientId: inactive.user.id },
      { recipientId: 2_147_483_647 },
      { recipientId: fixture.foreman.user.id, unknown: 1 },
    ]) {
      const response = await getApp().inject({
        method: 'POST',
        url: `/stages/${fixture.stage.id}/work-payments`,
        headers: { cookie: fixture.manager.cookie },
        payload: { paidAt: '2026-10-04', amountMinor: 1000, ...extra },
      });
      expect(response.statusCode, response.body).toBe(400);
    }
    expect((await auditRecords(getApp().db, fixture.manager.user.id, 'createWorkPayment')).events).toHaveLength(0);
  });

  it.each(['assigned', 'completed'] as const)(
    'не разрешает paid при статусе %s без приёмки или без плана',
    async (status) => {
      const fixture = await createFixture(status === 'completed' ? null : 10_000);
      await getApp().db.update(stages).set({ status }).where(eq(stages.id, fixture.stage.id));
      const payment = await getApp().inject({
        method: 'POST',
        url: `/stages/${fixture.stage.id}/work-payments`,
        headers: { cookie: fixture.manager.cookie },
        payload: { paidAt: '2026-10-04', workPlanRowId: fixture.planRow.id, amountMinor: 20_000 },
      });
      expect(payment.statusCode, payment.body).toBe(201);
      expect((await getApp().db.select().from(stages).where(eq(stages.id, fixture.stage.id)))[0]!.status).toBe(status);
      const response = await getApp().inject({
        method: 'PUT',
        url: `/stages/${fixture.stage.id}/status`,
        headers: { cookie: fixture.manager.cookie },
        payload: { expectedVersion: 1, status: 'paid' },
      });
      expect(response.statusCode, response.body).toBe(409);
    },
  );

  it('создаёт частичные платежи, показывает переплату и поддерживает изменение и удаление', async () => {
    const fixture = await createFixture();
    const invalid = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
      payload: { paidAt: '2026-10-01', amountMinor: 150, workPlanRowId: fixture.planRow.id },
    });
    expect(invalid.statusCode).toBe(400);

    const firstResponse = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
      payload: { paidAt: '2026-10-01', amountMinor: 4000, comment: ' Аванс ', workPlanRowId: fixture.planRow.id },
    });
    expect(firstResponse.statusCode, firstResponse.body).toBe(201);
    const first = firstResponse.json<WorkPayment>();
    expect(first).toMatchObject({ amountMinor: 4000, comment: 'Аванс', version: 1 });

    const secondResponse = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
      payload: { paidAt: '2026-10-02', amountMinor: 7000, workPlanRowId: fixture.planRow.id },
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

  it('разрешает мастеру свои выплаты и агрегаты этапа, запрещает изменение финансов', async () => {
    const fixture = await createFixture(null);
    const otherForeman = await createIdentity('foreman');
    const payment = await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
      payload: { paidAt: '2026-10-01', amountMinor: 5000, workPlanRowId: fixture.planRow.id },
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
    expect(forbiddenList.statusCode).toBe(200);
    expect(forbiddenList.json()).toHaveLength(1);
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

  it.each([10_000, 11_000])('переводит завершённый этап в paid при достаточной выплате %i', async (amountMinor) => {
    const fixture = await createFixture();
    await getApp().db.update(stages).set({ status: 'completed' }).where(eq(stages.id, fixture.stage.id));
    await getApp().inject({
      method: 'POST',
      url: `/stages/${fixture.stage.id}/work-payments`,
      headers: { cookie: fixture.manager.cookie },
      payload: { paidAt: '2026-10-01', amountMinor, workPlanRowId: fixture.planRow.id },
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
