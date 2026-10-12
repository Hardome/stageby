import { randomUUID } from 'node:crypto';

import fastifyCookie from '@fastify/cookie';
import { eq, inArray } from 'drizzle-orm';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { parseEnvironment } from '#app/config/env';
import { checklistItems, checklists } from '#app/db/schema/checklists';
import { files } from '#app/db/schema/files';
import { materialInvoices, materialShortages } from '#app/db/schema/materials';
import { projects } from '#app/db/schema/projects';
import { sessions } from '#app/db/schema/sessions';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import { workPayments } from '#app/db/schema/work-payments';
import { workPlanRows } from '#app/db/schema/work-plan-rows';
import type { DashboardProjectPage, DashboardSummary, Project, Stage } from '#app/generated/types.gen';
import { hashPassword } from '#app/modules/auth/password-hasher';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { addCalendarDays, calendarDate } from '#app/modules/dashboard/calendar';
import { dashboardModule } from '#app/modules/dashboard/index';
import { DashboardRepository } from '#app/modules/dashboard/repository';
import { projectModule } from '#app/modules/projects/index';
import { stageModule } from '#app/modules/stages/index';
import { UserRepository } from '#app/modules/users/repository';
import { registerAuthentication } from '#app/plugins/authentication';
import { registerErrorHandler } from '#app/plugins/error-handler';
import { setupModuleTest } from '#test/setup-module-test';
import { createPaymentPlanRow } from '#test/work-plan-row';

const projectIds: number[] = [];
const userIds: number[] = [];
const fileIds: number[] = [];
let passwordHash: string;
const getApp = setupModuleTest(async (app) => {
  registerErrorHandler(
    app,
    parseEnvironment({
      NODE_ENV: 'test',
      DATABASE_URL: process.env.DATABASE_URL,
      CORS_ORIGIN: 'http://localhost:5173',
      LOG_LEVEL: 'silent',
    }),
  );
  await app.register(fastifyCookie);
  await registerAuthentication(app);
  await app.register(projectModule);
  await app.register(stageModule);
  await app.register(dashboardModule);
});

beforeAll(async () => {
  passwordHash = await hashPassword('Dashboard-password-123!');
});
afterEach(async () => {
  vi.useRealTimers();
  if (projectIds.length > 0) await getApp().db.delete(projects).where(inArray(projects.id, projectIds));
  if (fileIds.length > 0) await getApp().db.delete(files).where(inArray(files.id, fileIds));
  if (userIds.length > 0) await getApp().db.delete(users).where(inArray(users.id, userIds));
  projectIds.length = 0;
  userIds.length = 0;
  fileIds.length = 0;
});

async function identity(role: 'manager' | 'foreman' = 'manager') {
  const user = await new UserRepository(getApp().db).create({
    login: `dashboard.${randomUUID().replaceAll('-', '')}`,
    fullName: 'Мастер панели',
    role,
    passwordHash,
  });
  userIds.push(user.id);
  const session = await new SessionService(new SessionRepository(getApp().db), 12).issue(user.id);
  return { user, cookie: `stageby_session=${session.accessToken}` };
}

async function fixture(cookie: string, assigneeId: number, start = calendarDate()) {
  const response = await getApp().inject({
    method: 'POST',
    url: '/projects',
    headers: { cookie, 'idempotency-key': randomUUID() },
    payload: {
      ownerName: 'Клиент панели',
      address: 'Екатеринбург',
      coordinates: { latitude: 56.84, longitude: 60.61 },
      plannedStartDate: addCalendarDays(start, -20),
      plannedEndDate: addCalendarDays(start, 50),
      documentFileIds: [],
      stages: ['foundation', 'walls', 'roof'].map((type, index) => ({
        type,
        plannedStartDate: addCalendarDays(start, index * 10),
        plannedEndDate: addCalendarDays(start, index * 10 + 5),
        assigneeId,
        plannedWorkAmountMinor: 10_000,
        plannedMaterialAmountMinor: 20_000,
        checklistItems: [{ title: 'Проверка' }, { title: 'Уборка' }],
      })),
    },
  });
  if (response.statusCode !== 201) throw new Error(`Project fixture failed: ${response.body}`);
  const project = response.json<Project>();
  projectIds.push(project.id);
  const included = await getApp()
    .db.select()
    .from(stages)
    .where(eq(stages.projectId, project.id))
    .orderBy(stages.position);
  return { project, included };
}

async function invoice(stageId: number, userId: number, amountMinor: number, paid: boolean, delivered: boolean) {
  const now = new Date();
  const [file] = await getApp()
    .db.insert(files)
    .values({
      purpose: 'material_invoice',
      status: 'uploaded',
      storageKey: randomUUID(),
      originalName: 'invoice.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      checksumSha256: 'a'.repeat(64),
      uploadedByUserId: userId,
      uploadExpiresAt: now,
      uploadedAt: now,
    })
    .returning();
  fileIds.push(file!.id);
  const [value] = await getApp()
    .db.insert(materialInvoices)
    .values({
      stageId,
      fileId: file!.id,
      amountMinor,
      paidAt: paid ? now : null,
      paidAmountMinor: paid ? amountMinor : null,
      paidDate: paid ? calendarDate(now) : null,
      paidByUserId: paid ? userId : null,
      deliveredAt: delivered ? now : null,
      deliveredByUserId: delivered ? userId : null,
    })
    .returning();
  return value!;
}

async function page(cookie: string, query = '') {
  const response = await getApp().inject({ url: `/dashboard/projects${query}`, headers: { cookie } });
  if (response.statusCode !== 200) throw new Error(`Dashboard request failed: ${response.body}`);
  return response.json<DashboardProjectPage>();
}

async function summary(cookie: string, through: string) {
  const response = await getApp().inject({ url: `/dashboard/summary?through=${through}`, headers: { cookie } });
  if (response.statusCode !== 200) throw new Error(`Dashboard summary request failed: ${response.body}`);
  return response.json<DashboardSummary>();
}

describe('Dashboard API', () => {
  it('проверяет роль и параметры двух независимых запросов', async () => {
    const manager = await identity();
    const foreman = await identity('foreman');
    for (const url of ['/dashboard/summary', '/dashboard/projects']) {
      expect((await getApp().inject({ url })).statusCode).toBe(401);
      expect((await getApp().inject({ url, headers: { cookie: foreman.cookie } })).statusCode).toBe(403);
    }
    for (const query of ['limit=0', 'limit=101', 'offset=-1', 'limit=1.5', 'unknown=1'])
      expect(
        (await getApp().inject({ url: `/dashboard/projects?${query}`, headers: { cookie: manager.cookie } }))
          .statusCode,
      ).toBe(400);
    vi.spyOn(DashboardRepository.prototype, 'summary').mockRejectedValue(new Error('Summary unavailable'));
    expect((await getApp().inject({ url: '/dashboard/summary', headers: { cookie: manager.cookie } })).statusCode).toBe(
      500,
    );
    expect((await page(manager.cookie)).items).toEqual([]);
    vi.restoreAllMocks();
    vi.spyOn(DashboardRepository.prototype, 'list').mockRejectedValue(new Error('Projects unavailable'));
    expect(
      (await getApp().inject({ url: '/dashboard/projects', headers: { cookie: manager.cookie } })).statusCode,
    ).toBe(500);
    const summary = await getApp().inject({ url: '/dashboard/summary', headers: { cookie: manager.cookie } });
    expect(summary.statusCode, summary.body).toBe(200);
    expect(summary.json()).toMatchObject({
      activeProjectCount: 0,
      total: { plannedAmountMinor: 0, actualAmountMinor: 0, balanceAmountMinor: 0, isPlanComplete: true },
    });
  });

  it.each([
    ['2026-12-31T18:59:59Z', '2026-12-31'],
    ['2026-12-31T19:00:00Z', '2027-01-01'],
    ['2028-02-28T19:00:00Z', '2028-02-29'],
  ])('проверяет календарные границы UTC+5: %s', async (instant, expectedToday) => {
    const manager = await identity();
    await getApp()
      .db.update(sessions)
      .set({ expiresAt: new Date('2100-01-01T00:00:00Z') })
      .where(eq(sessions.userId, manager.user.id));
    // Keep real timers for database and HTTP; freeze only the wall clock.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(instant));
    const today = calendarDate();
    expect(today).toBe(expectedToday);
    for (const through of [undefined, today, addCalendarDays(today, 30)]) {
      const response = await getApp().inject({
        url: `/dashboard/summary${through ? `?through=${through}` : ''}`,
        headers: { cookie: manager.cookie },
      });
      expect(response.statusCode, response.body).toBe(200);
      expect(response.json().through).toBe(through ?? today);
    }
    for (const through of [addCalendarDays(today, -1), addCalendarDays(today, 31), '2026-02-30', 'bad', ''])
      expect(
        (await getApp().inject({ url: `/dashboard/summary?through=${through}`, headers: { cookie: manager.cookie } }))
          .statusCode,
      ).toBe(400);
    expect(
      (await getApp().inject({ url: '/dashboard/summary?unknown=1', headers: { cookie: manager.cookie } })).statusCode,
    ).toBe(400);
  });

  it('считает один периметр планов и фактов без умножения платежей на счета', async () => {
    const manager = await identity();
    const foreman = await identity('foreman');
    const { project, included } = await fixture(manager.cookie, foreman.user.id);
    const first = included[0]!;
    const second = included[1]!;
    const beforeDue = await getApp().inject({ url: '/dashboard/summary', headers: { cookie: manager.cookie } });
    expect(beforeDue.statusCode, beforeDue.body).toBe(200);
    expect(beforeDue.json()).toMatchObject({
      activeProjectCount: 1,
      total: { plannedAmountMinor: 0, actualAmountMinor: 0 },
    });
    const planRow = await createPaymentPlanRow(getApp().db, first.id, foreman.user.id);
    await getApp()
      .db.insert(workPayments)
      .values(
        [3000, 4000].map((amountMinor) => ({
          stageId: first.id,
          workPlanRowId: planRow.id,
          recipientId: foreman.user.id,
          createdByUserId: manager.user.id,
          paidAt: calendarDate(),
          amountMinor,
        })),
      );
    await invoice(first.id, manager.user.id, 5000, true, true);
    await invoice(first.id, manager.user.id, 6000, true, false);
    await invoice(first.id, manager.user.id, 8000, false, true);
    // Paid stages remain in the financial perimeter; later and archived stages do not.
    await getApp().db.update(stages).set({ status: 'paid' }).where(eq(stages.id, first.id));
    const archived = await fixture(manager.cookie, foreman.user.id);
    await getApp().db.update(projects).set({ isArchived: true }).where(eq(projects.id, archived.project.id));
    const response = await getApp().inject({
      url: `/dashboard/summary?through=${first.plannedEndDate}`,
      headers: { cookie: manager.cookie },
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json<DashboardSummary>()).toMatchObject({
      activeProjectCount: 1,
      works: { plannedAmountMinor: 10_000, actualAmountMinor: 7000, balanceAmountMinor: 3000, isPlanComplete: true },
      materials: {
        plannedAmountMinor: 20_000,
        actualAmountMinor: 11_000,
        balanceAmountMinor: 9000,
        isPlanComplete: true,
      },
      total: {
        plannedAmountMinor: 30_000,
        actualAmountMinor: 18_000,
        balanceAmountMinor: 12_000,
        isPlanComplete: true,
      },
    });
    const row = (await page(manager.cookie)).items[0]!;
    expect(row).toMatchObject({
      projectId: project.id,
      finances: { totalPlannedAmountMinor: 90_000, totalActualAmountMinor: 18_000 },
      selectedStage: { stageId: second.id },
    });
    const card = await getApp().inject({ url: `/projects/${project.id}`, headers: { cookie: manager.cookie } });
    expect(card.json<Project>().finances).toEqual(row.finances);
    const selected = await getApp().inject({ url: `/stages/${second.id}`, headers: { cookie: manager.cookie } });
    expect(row.selectedStage!.finances.totalActualAmountMinor).toBe(selected.json<Stage>().totalActualAmountMinor);
  });

  it('сохраняет неизвестный план и отрицательный остаток, нулевой план считается заданным', async () => {
    const manager = await identity();
    const foreman = await identity('foreman');
    const { included } = await fixture(manager.cookie, foreman.user.id);
    const first = included[0]!;
    await getApp().db.delete(workPlanRows).where(eq(workPlanRows.stageId, first.id));
    await getApp()
      .db.update(stages)
      .set({ plannedWorkAmountMinor: null, plannedMaterialAmountMinor: 0 })
      .where(eq(stages.id, first.id));
    await invoice(first.id, manager.user.id, 1000, true, false);
    const response = await getApp().inject({
      url: `/dashboard/summary?through=${first.plannedEndDate}`,
      headers: { cookie: manager.cookie },
    });
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toMatchObject({
      works: { plannedAmountMinor: null, balanceAmountMinor: null, isPlanComplete: false },
      materials: { plannedAmountMinor: 0, actualAmountMinor: 1000, balanceAmountMinor: -1000, isPlanComplete: true },
      total: { plannedAmountMinor: null, actualAmountMinor: 1000, balanceAmountMinor: null, isPlanComplete: false },
    });
  });

  it('отбирает строки по приоритетному сроку, а факт — по тому же периметру и дате оплаты', async () => {
    const manager = await identity();
    const foreman = await identity('foreman');
    const { included } = await fixture(manager.cookie, foreman.user.id);
    const [first, second, third] = included;
    const through = first!.plannedEndDate!;
    await getApp()
      .db.delete(workPlanRows)
      .where(
        inArray(
          workPlanRows.stageId,
          included.map((stage) => stage.id),
        ),
      );
    await getApp().db.update(stages).set({ plannedEndDate: null }).where(eq(stages.id, third!.id));
    const rows = await getApp()
      .db.insert(workPlanRows)
      .values([
        { stageId: first!.id, amountMinor: 1000 },
        { stageId: first!.id, amountMinor: 2000, dueDate: addCalendarDays(through, 1) },
        { stageId: first!.id, amountMinor: 3000, dueDate: addCalendarDays(through, -1) },
        { stageId: second!.id, amountMinor: 4000, dueDate: through },
        { stageId: third!.id, amountMinor: 5000, dueDate: through },
        { stageId: third!.id, amountMinor: 6000 },
      ])
      .returning();
    await getApp()
      .db.insert(workPayments)
      .values(
        [
          { row: rows[0]!, amountMinor: 400, paidAt: addCalendarDays(through, -1) },
          { row: rows[0]!, amountMinor: 600, paidAt: through },
          { row: rows[0]!, amountMinor: 900, paidAt: addCalendarDays(through, 1) },
          { row: rows[1]!, amountMinor: 2000, paidAt: addCalendarDays(through, -1) },
          { row: rows[2]!, amountMinor: 3100, paidAt: through },
          { row: rows[3]!, amountMinor: 500, paidAt: through },
          { row: rows[4]!, amountMinor: 500, paidAt: through },
          { row: rows[5]!, amountMinor: 600, paidAt: through },
        ].map(({ row, amountMinor, paidAt }) => ({
          stageId: row.stageId,
          workPlanRowId: row.id,
          recipientId: foreman.user.id,
          createdByUserId: manager.user.id,
          amountMinor,
          paidAt,
        })),
      );
    for (const [days, paidAmountMinor] of [
      [-1, 1300],
      [0, 700],
      [1, 900],
    ] as const) {
      const value = await invoice(first!.id, manager.user.id, 99_900, true, false);
      await getApp()
        .db.update(materialInvoices)
        .set({
          paidAmountMinor,
          paidDate: addCalendarDays(through, days),
        })
        .where(eq(materialInvoices.id, value.id));
    }
    await invoice(first!.id, manager.user.id, 1000, false, true);
    await invoice(second!.id, manager.user.id, 1000, true, false);
    await invoice(third!.id, manager.user.id, 1000, true, false);
    expect(await summary(manager.cookie, through)).toMatchObject({
      works: { plannedAmountMinor: 13_000, actualAmountMinor: 5100, balanceAmountMinor: 7900, isPlanComplete: true },
      materials: {
        plannedAmountMinor: 20_000,
        actualAmountMinor: 2000,
        balanceAmountMinor: 18_000,
        isPlanComplete: true,
      },
      total: { plannedAmountMinor: 33_000, actualAmountMinor: 7100, balanceAmountMinor: 25_900, isPlanComplete: true },
    });
  });

  it.each([
    [1000, 1000, 0],
    [1000, 1200, -200],
    [0, 100, -100],
  ])('сохраняет план строки %i при выплате %i и остатке %i', async (plan, payment, balance) => {
    const manager = await identity();
    const foreman = await identity('foreman');
    const { included } = await fixture(manager.cookie, foreman.user.id);
    const first = included[0]!;
    await getApp().db.update(stages).set({ plannedWorkAmountMinor: null }).where(eq(stages.id, first.id));
    const [row] = await getApp()
      .db.update(workPlanRows)
      .set({ amountMinor: plan })
      .where(eq(workPlanRows.stageId, first.id))
      .returning();
    await getApp().db.insert(workPayments).values({
      stageId: first.id,
      workPlanRowId: row!.id,
      recipientId: foreman.user.id,
      createdByUserId: manager.user.id,
      paidAt: first.plannedEndDate!,
      amountMinor: payment,
    });
    expect((await summary(manager.cookie, first.plannedEndDate!)).works).toEqual({
      plannedAmountMinor: plan,
      actualAmountMinor: payment,
      balanceAmountMinor: balance,
      isPlanComplete: true,
    });
  });

  it('неизвестный план материалов делает общий план неполным, обязательства вне даты не влияют на полноту', async () => {
    const manager = await identity();
    const foreman = await identity('foreman');
    const { included } = await fixture(manager.cookie, foreman.user.id);
    const first = included[0]!;
    await getApp()
      .db.update(stages)
      .set({ plannedMaterialAmountMinor: null })
      .where(eq(stages.projectId, first.projectId));
    await getApp()
      .db.delete(workPlanRows)
      .where(
        inArray(
          workPlanRows.stageId,
          included.slice(1).map((stage) => stage.id),
        ),
      );
    await invoice(first.id, manager.user.id, 1000, true, false);
    expect(await summary(manager.cookie, first.plannedEndDate!)).toMatchObject({
      works: { plannedAmountMinor: 10_000, isPlanComplete: true },
      materials: { plannedAmountMinor: null, actualAmountMinor: 1000, balanceAmountMinor: null, isPlanComplete: false },
      total: { plannedAmountMinor: null, actualAmountMinor: 1000, balanceAmountMinor: null, isPlanComplete: false },
    });
  });

  it('исключённые этапы не влияют на финансы, текущий этап и активный счётчик', async () => {
    const manager = await identity();
    const foreman = await identity('foreman');
    const { project, included } = await fixture(manager.cookie, foreman.user.id);
    const first = included[0]!;
    await invoice(first.id, manager.user.id, 1000, true, false);
    await getApp().db.update(stages).set({ isIncluded: false }).where(eq(stages.id, first.id));
    expect((await page(manager.cookie)).items[0]).toMatchObject({
      selectedStage: { stageId: included[1]!.id, stageCount: 2 },
      finances: { totalPlannedAmountMinor: 60_000, totalActualAmountMinor: 0 },
    });
    expect(await summary(manager.cookie, first.plannedEndDate!)).toMatchObject({
      activeProjectCount: 1,
      total: { plannedAmountMinor: 0, actualAmountMinor: 0, balanceAmountMinor: 0, isPlanComplete: true },
    });
    await getApp()
      .db.update(stages)
      .set({ status: 'paid' })
      .where(
        inArray(
          stages.id,
          included.slice(1).map((stage) => stage.id),
        ),
      );
    expect((await page(manager.cookie)).items[0]).toMatchObject({
      projectId: project.id,
      selectedStage: null,
      status: 'completed',
    });
    expect((await summary(manager.cookie, first.plannedEndDate!)).activeProjectCount).toBe(0);
  });

  it('выбирает первый невыплаченный этап для всех данных, переключает его после paid и завершает только после всех выплат', async () => {
    const manager = await identity();
    const foreman = await identity('foreman');
    const { project, included } = await fixture(manager.cookie, foreman.user.id);
    const [first, second, last] = included;
    await getApp().db.update(stages).set({ status: 'paid' }).where(eq(stages.id, last!.id));
    await getApp().db.update(stages).set({ status: 'in_progress' }).where(eq(stages.id, second!.id));
    await getApp().db.update(stages).set({ status: 'acceptance' }).where(eq(stages.id, first!.id));
    expect((await page(manager.cookie)).items[0]!.selectedStage).toMatchObject({
      stageId: first!.id,
      status: 'acceptance',
    });
    await getApp().db.update(stages).set({ status: 'completed' }).where(eq(stages.id, first!.id));
    const [checklist] = await getApp().db.select().from(checklists).where(eq(checklists.stageId, first!.id));
    await getApp()
      .db.update(checklistItems)
      .set({ isCompleted: true, completedAt: new Date(), completedByUserId: foreman.user.id })
      .where(eq(checklistItems.checklistId, checklist!.id));
    const firstInvoice = await invoice(first!.id, manager.user.id, 1000, true, false);
    await invoice(first!.id, manager.user.id, 2000, false, true);
    await getApp()
      .db.insert(materialShortages)
      .values({ invoiceId: firstInvoice.id, comment: 'Не хватает', reportedByUserId: foreman.user.id });
    let row = (await page(manager.cookie)).items[0]!;
    expect(row.status).not.toBe('completed');
    expect(row.selectedStage).toMatchObject({
      stageId: first!.id,
      plannedStartDate: first!.plannedStartDate,
      plannedEndDate: first!.plannedEndDate,
      stageCount: 3,
      assignee: { id: foreman.user.id },
      status: 'completed',
      progressPercent: 100,
      materials: {
        color: 'red',
        invoiceCount: 2,
        isPartiallyPaid: true,
        isPartiallyDelivered: true,
        openShortageCount: 1,
      },
      finances: { actualMaterialAmountMinor: 1000 },
    });
    await getApp().db.update(stages).set({ status: 'paid' }).where(eq(stages.id, first!.id));
    row = (await page(manager.cookie)).items[0]!;
    expect(row.selectedStage).toMatchObject({
      stageId: second!.id,
      status: 'in_progress',
      progressPercent: 0,
      materials: { color: 'red', invoiceCount: 0 },
      finances: { actualMaterialAmountMinor: 0 },
    });
    await getApp().db.update(stages).set({ status: 'paid' }).where(eq(stages.id, second!.id));
    row = (await page(manager.cookie)).items[0]!;
    expect(row).toMatchObject({ status: 'completed', selectedStage: null });
    const summary = await getApp().inject({ url: '/dashboard/summary', headers: { cookie: manager.cookie } });
    expect(summary.json().activeProjectCount).toBe(0);
    expect(
      (await getApp().inject({ url: `/projects/${project.id}`, headers: { cookie: manager.cookie } })).json().status,
    ).toBe('completed');
  });

  it('сортирует по началу выбранного этапа и ID, применяет пагинацию и помещает завершённые объекты в конец', async () => {
    const manager = await identity();
    const foreman = await identity('foreman');
    const undated = await fixture(manager.cookie, foreman.user.id);
    await getApp().db.update(stages).set({ plannedStartDate: null }).where(eq(stages.id, undated.included[0]!.id));
    const first = await fixture(manager.cookie, foreman.user.id);
    const second = await fixture(manager.cookie, foreman.user.id);
    const earlier = await fixture(manager.cookie, foreman.user.id, addCalendarDays(calendarDate(), -1));
    const completed = await fixture(manager.cookie, foreman.user.id);
    await getApp().db.update(stages).set({ status: 'paid' }).where(eq(stages.projectId, completed.project.id));
    const selectQueries = vi.spyOn(getApp().db, 'select');
    expect((await page(manager.cookie)).items.map((row) => row.projectId)).toEqual([
      earlier.project.id,
      first.project.id,
      second.project.id,
      undated.project.id,
      completed.project.id,
    ]);
    const fullPageQueryCount = selectQueries.mock.calls.length;
    selectQueries.mockClear();
    expect(await page(manager.cookie, '?limit=1&offset=2')).toMatchObject({
      total: 5,
      limit: 1,
      offset: 2,
      items: [{ projectId: second.project.id }],
    });
    expect(selectQueries.mock.calls.length).toBe(fullPageQueryCount);
    expect(fullPageQueryCount).toBeLessThanOrEqual(6);
    expect((await page(manager.cookie, '?offset=100')).items).toEqual([]);
  });
});
