import { randomUUID } from 'node:crypto';

import fastifyCookie from '@fastify/cookie';
import { eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { parseEnvironment } from '#app/config/env';
import { files } from '#app/db/schema/files';
import { projects } from '#app/db/schema/projects';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import { workPayments } from '#app/db/schema/work-payments';
import type { MaterialShortage, Project, Stage, StageMaterialInvoice } from '#app/generated/types.gen';
import { hashPassword } from '#app/modules/auth/password-hasher';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { materialModule } from '#app/modules/materials/index';
import { loadStageSummaries } from '#app/modules/materials/summary';
import { projectModule } from '#app/modules/projects/index';
import { stageModule } from '#app/modules/stages/index';
import { UserRepository } from '#app/modules/users/repository';
import { registerAuthentication } from '#app/plugins/authentication';
import { registerErrorHandler } from '#app/plugins/error-handler';
import { auditRecords } from '#test/audit-records';
import { setupModuleTest } from '#test/setup-module-test';

const PASSWORD = 'Materials-test-password-123!';
const createdProjectIds: number[] = [];
const createdUserIds: number[] = [];
const createdFileIds: number[] = [];
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
  await app.register(materialModule);
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
  if (createdFileIds.length > 0) {
    await getApp().db.delete(files).where(inArray(files.id, createdFileIds));
    createdFileIds.length = 0;
  }
  if (createdUserIds.length > 0) {
    await getApp().db.delete(users).where(inArray(users.id, createdUserIds));
    createdUserIds.length = 0;
  }
});

async function identity(role: 'manager' | 'foreman') {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 20);
  const user = await new UserRepository(getApp().db).create({
    login: `materials.${suffix}`,
    passwordHash,
    fullName: `Пользователь ${suffix}`,
    role,
  });
  createdUserIds.push(user.id);
  const session = await new SessionService(new SessionRepository(getApp().db), 12).issue(user.id);
  return { user, cookie: `stageby_session=${session.accessToken}` };
}

async function fixture() {
  const manager = await identity('manager');
  const foreman = await identity('foreman');
  const outsider = await identity('foreman');
  const response = await getApp().inject({
    method: 'POST',
    url: '/projects',
    headers: { cookie: manager.cookie, 'idempotency-key': randomUUID() },
    payload: {
      ownerName: `Клиент ${randomUUID()}`,
      address: 'Екатеринбург, ул. Материальная, 1',
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
          plannedWorkAmountMinor: 0,
          plannedMaterialAmountMinor: 100_000,
          checklistItems: [{ title: 'Пункт' }],
        },
      ],
    },
  });
  if (response.statusCode !== 201) throw new Error(`Не удалось создать тестовый проект: ${response.body}`);
  const project = response.json<Project>();
  createdProjectIds.push(project.id);
  const [stage] = await getApp().db.select().from(stages).where(eq(stages.projectId, project.id));
  return { manager, foreman, outsider, stage: stage! };
}

async function uploadedInvoiceFile(userId: number, mimeType = 'application/pdf', sizeBytes = 1024) {
  const uploadedAt = new Date();
  const [file] = await getApp()
    .db.insert(files)
    .values({
      status: 'uploaded',
      purpose: 'material_invoice',
      storageKey: `tests/materials/${randomUUID()}`,
      originalName: mimeType === 'application/pdf' ? 'invoice.pdf' : 'invoice.jpg',
      mimeType,
      sizeBytes,
      checksumSha256: randomUUID().replaceAll('-', '').repeat(2),
      uploadedByUserId: userId,
      uploadExpiresAt: uploadedAt,
      uploadedAt,
    })
    .returning();
  createdFileIds.push(file!.id);
  return file!;
}

async function createInvoice(stageId: number, fileId: number, amountMinor: number, cookie: string) {
  return getApp().inject({
    method: 'POST',
    url: `/stages/${stageId}/material-invoices`,
    headers: { cookie },
    payload: { fileId, amountMinor, supplierName: 'Стройснаб' },
  });
}

describe('Материалы, счета и нехватки', () => {
  it('возвращает прежний счёт при повторе и не пишет повторный аудит', async () => {
    const data = await fixture();
    const file = await uploadedInvoiceFile(data.manager.user.id);
    const first = await createInvoice(data.stage.id, file.id, 10_000, data.manager.cookie);
    const retry = await createInvoice(data.stage.id, file.id, 10_000, data.manager.cookie);
    expect(retry.statusCode, retry.body).toBe(201);
    expect(retry.json()).toEqual(first.json());
    const changed = await createInvoice(data.stage.id, file.id, 20_000, data.manager.cookie);
    expect(changed.statusCode).toBe(400);
    for (let index = 0; index < 9; index++) {
      const next = await uploadedInvoiceFile(data.manager.user.id);
      expect((await createInvoice(data.stage.id, next.id, 10_000, data.manager.cookie)).statusCode).toBe(201);
    }
    expect((await createInvoice(data.stage.id, file.id, 10_000, data.manager.cookie)).json()).toEqual(first.json());
    const audit = await auditRecords(getApp().db, data.manager.user.id, 'createMaterialInvoice');
    expect(audit.events).toHaveLength(10);
    expect(audit.changes[0]!.after).toMatchObject({ stageId: data.stage.id, amountMinor: 10_000 });
  });

  it('считает деньги без умножения сумм и отделяет цвет от комплектации после старта', async () => {
    const data = await fixture();
    const read = async () =>
      (
        await getApp().inject({
          method: 'GET',
          url: `/stages/${data.stage.id}`,
          headers: { cookie: data.manager.cookie },
        })
      ).json<Stage>();
    expect((await read()).materialSummary).toMatchObject({
      color: 'red',
      isPartiallyPaid: false,
      isPartiallyDelivered: false,
    });
    const invoices: StageMaterialInvoice[] = [];
    for (const amount of [10_000, 20_000]) {
      const file = await uploadedInvoiceFile(data.manager.user.id);
      invoices.push((await createInvoice(data.stage.id, file.id, amount, data.manager.cookie)).json());
    }
    const update = async (invoice: StageMaterialInvoice, isPaid: boolean, isDelivered: boolean) => {
      const response = await getApp().inject({
        method: 'PATCH',
        url: `/material-invoices/${invoice.id}`,
        headers: { cookie: data.manager.cookie },
        payload: { expectedVersion: invoice.version, isPaid, isDelivered },
      });
      expect(response.statusCode, response.body).toBe(200);
      return response.json<StageMaterialInvoice>();
    };
    invoices[0] = await update(invoices[0]!, true, true);
    expect((await read()).materialSummary).toMatchObject({
      color: 'yellow',
      isPartiallyPaid: true,
      isPartiallyDelivered: true,
    });
    await getApp()
      .db.insert(workPayments)
      .values([
        { stageId: data.stage.id, amountMinor: 30_000, paidAt: '2026-10-04', createdByUserId: data.manager.user.id },
        { stageId: data.stage.id, amountMinor: 40_000, paidAt: '2026-10-04', createdByUserId: data.manager.user.id },
      ]);
    await getApp()
      .db.update(stages)
      .set({ status: 'in_progress', plannedWorkAmountMinor: null })
      .where(eq(stages.id, data.stage.id));
    invoices[1] = await update(invoices[1]!, true, true);
    expect(await read()).toMatchObject({
      status: 'in_progress',
      actualWorkAmountMinor: 70_000,
      actualMaterialAmountMinor: 30_000,
      totalActualAmountMinor: 100_000,
      totalPlannedAmountMinor: null,
      workBalanceAmountMinor: null,
      materialSummary: { color: 'green', isPartiallyPaid: false, isPartiallyDelivered: false },
    });
    const card = await getApp().inject({
      url: `/projects/${data.stage.projectId}`,
      headers: { cookie: data.manager.cookie },
    });
    expect(card.statusCode, card.body).toBe(200);
    expect(card.json()).toMatchObject({
      finances: {
        plannedWorkAmountMinor: null,
        plannedMaterialAmountMinor: 100_000,
        actualWorkAmountMinor: 70_000,
        actualMaterialAmountMinor: 30_000,
        totalActualAmountMinor: 100_000,
        totalPlannedAmountMinor: null,
        isPlanComplete: false,
        variancePercent: null,
      },
    });
    for (const url of [`/stages?projectId=${data.stage.projectId}`, `/projects/${data.stage.projectId}/stages`]) {
      const response = await getApp().inject({ url, headers: { cookie: data.foreman.cookie } });
      expect(response.statusCode, response.body).toBe(200);
      expect(response.json().items).toMatchObject([
        {
          id: data.stage.id,
          actualWorkAmountMinor: 70_000,
          actualMaterialAmountMinor: 30_000,
          totalActualAmountMinor: 100_000,
          materialSummary: { color: 'green' },
        },
      ]);
    }
    for (let index = 0; index < 2; index++) {
      const shortage = await getApp().inject({
        method: 'POST',
        url: `/material-invoices/${invoices[0]!.id}/shortages`,
        headers: { cookie: data.foreman.cookie },
        payload: { comment: 'Не хватает материала' },
      });
      expect(shortage.statusCode).toBe(201);
    }
    expect(await read()).toMatchObject({
      status: 'in_progress',
      actualMaterialAmountMinor: 30_000,
      materialSummary: { color: 'red', openShortageCount: 2, deliveredInvoiceCount: 2 },
    });
    const batch = await loadStageSummaries(getApp().db, [data.stage.id]);
    expect(batch.get(data.stage.id)!.materialSummary).toEqual((await read()).materialSummary);
    const other = await fixture();
    const combined = await loadStageSummaries(getApp().db, [data.stage.id, other.stage.id]);
    expect(combined.get(data.stage.id)!.totalActualAmountMinor).toBe(100_000);
    expect(combined.get(other.stage.id)!).toMatchObject({
      totalActualAmountMinor: 0,
      materialSummary: { color: 'red', invoiceCount: 0 },
    });
    expect((await loadStageSummaries(getApp().db, [])).size).toBe(0);
  });
  it('учитывает счета этапа, оплату и доставку независимо', async () => {
    const data = await fixture();
    const planned = await getApp().inject({
      method: 'PATCH',
      url: `/stages/${data.stage.id}`,
      headers: { cookie: data.manager.cookie },
      payload: { expectedVersion: 1, plannedMaterialAmountMinor: 120_000 },
    });
    expect(planned.statusCode, planned.body).toBe(200);
    expect(planned.json<Stage>().plannedMaterialAmountMinor).toBe(120_000);
    const fileIds = await Promise.all([
      uploadedInvoiceFile(data.manager.user.id),
      uploadedInvoiceFile(data.manager.user.id, 'image/jpeg'),
      uploadedInvoiceFile(data.manager.user.id),
    ]);
    const first = await createInvoice(data.stage.id, fileIds[0]!.id, 10_000, data.manager.cookie);
    const second = await createInvoice(data.stage.id, fileIds[1]!.id, 20_000, data.manager.cookie);
    const third = await createInvoice(data.stage.id, fileIds[2]!.id, 30_000, data.manager.cookie);
    expect([first.statusCode, second.statusCode, third.statusCode]).toEqual([201, 201, 201]);
    const invoices = [
      first.json<StageMaterialInvoice>(),
      second.json<StageMaterialInvoice>(),
      third.json<StageMaterialInvoice>(),
    ];

    let stage = await getApp().inject({
      method: 'GET',
      url: `/stages/${data.stage.id}`,
      headers: { cookie: data.manager.cookie },
    });
    expect(stage.json<Stage>()).toMatchObject({
      actualMaterialAmountMinor: 0,
      totalActualAmountMinor: 0,
      materialSummary: { invoiceCount: 3, deliveredInvoiceCount: 0, openShortageCount: 0 },
    });

    const paid = await getApp().inject({
      method: 'PATCH',
      url: `/material-invoices/${invoices[0]!.id}`,
      headers: { cookie: data.manager.cookie },
      payload: { expectedVersion: 1, isPaid: true },
    });
    expect(paid.statusCode, paid.body).toBe(200);
    stage = await getApp().inject({
      method: 'GET',
      url: `/stages/${data.stage.id}`,
      headers: { cookie: data.manager.cookie },
    });
    expect(stage.json<Stage>().actualMaterialAmountMinor).toBe(10_000);

    const forbiddenPayment = await getApp().inject({
      method: 'PATCH',
      url: `/material-invoices/${invoices[1]!.id}`,
      headers: { cookie: data.foreman.cookie },
      payload: { expectedVersion: 1, isPaid: true },
    });
    expect(forbiddenPayment.statusCode).toBe(403);

    for (const invoice of invoices) {
      const delivered = await getApp().inject({
        method: 'PATCH',
        url: `/material-invoices/${invoice.id}`,
        headers: { cookie: data.foreman.cookie },
        payload: { expectedVersion: invoice.id === invoices[0]!.id ? 2 : 1, isDelivered: true },
      });
      expect(delivered.statusCode, delivered.body).toBe(200);
    }
    const [supplied] = await getApp().db.select().from(stages).where(eq(stages.id, data.stage.id));
    expect(supplied!.status).toBe('supplied');

    const creation = await auditRecords(getApp().db, data.manager.user.id, 'createMaterialInvoice');
    expect(creation.events).toHaveLength(3);
    expect(creation.changes.every((change) => change.stageId === data.stage.id)).toBe(true);
    const delivery = await auditRecords(getApp().db, data.foreman.user.id, 'updateMaterialInvoice');
    expect(delivery.events).toHaveLength(3);
    const last = delivery.changes.filter((change) => change.eventId === delivery.events.at(-1)!.id);
    expect(last.map((change) => change.entityType).sort()).toEqual(['material_invoices', 'stages']);
    expect(last.find((change) => change.entityType === 'stages')).toMatchObject({
      before: { status: 'assigned' },
      after: { status: 'supplied' },
    });
  });

  it('не закрывает нехватку новым счётом и разрешает устранение только руководителю', async () => {
    const data = await fixture();
    const file = await uploadedInvoiceFile(data.manager.user.id);
    const created = await createInvoice(data.stage.id, file.id, 10_000, data.manager.cookie);
    const invoice = created.json<StageMaterialInvoice>();
    const shortageResponse = await getApp().inject({
      method: 'POST',
      url: `/material-invoices/${invoice.id}/shortages`,
      headers: { cookie: data.foreman.cookie },
      payload: { comment: '  Не доставлены крепёжные элементы  ' },
    });
    expect(shortageResponse.statusCode, shortageResponse.body).toBe(201);
    const shortage = shortageResponse.json<MaterialShortage>();
    expect(shortage.comment).toBe('Не доставлены крепёжные элементы');

    const secondFile = await uploadedInvoiceFile(data.manager.user.id);
    expect((await createInvoice(data.stage.id, secondFile.id, 20_000, data.manager.cookie)).statusCode).toBe(201);
    const invoices = await getApp().inject({
      method: 'GET',
      url: `/stages/${data.stage.id}/material-invoices`,
      headers: { cookie: data.foreman.cookie },
    });
    const current = invoices.json<StageMaterialInvoice[]>()[0]!.shortages[0]!;
    expect(current.resolvedAt).toBeNull();

    const foremanResolve = await getApp().inject({
      method: 'POST',
      url: `/material-shortages/${shortage.id}/resolution`,
      headers: { cookie: data.foreman.cookie },
      payload: { expectedVersion: 1 },
    });
    expect(foremanResolve.statusCode).toBe(403);
    const resolved = await getApp().inject({
      method: 'POST',
      url: `/material-shortages/${shortage.id}/resolution`,
      headers: { cookie: data.manager.cookie },
      payload: { expectedVersion: 1, resolutionComment: 'Доставлено отдельно' },
    });
    expect(resolved.statusCode, resolved.body).toBe(200);
    expect(resolved.json<MaterialShortage>().resolvedAt).not.toBeNull();
  });

  it('отклоняет счёт без подходящего файла и скрывает чужой этап от мастера', async () => {
    const data = await fixture();
    const missingFile = await createInvoice(data.stage.id, 2_147_483_647, 10_000, data.manager.cookie);
    const missingAmount = await getApp().inject({
      method: 'POST',
      url: `/stages/${data.stage.id}/material-invoices`,
      headers: { cookie: data.manager.cookie },
      payload: { fileId: 1 },
    });
    expect(missingFile.statusCode).toBe(400);
    expect(missingAmount.statusCode).toBe(400);
    const hidden = await getApp().inject({
      method: 'GET',
      url: `/stages/${data.stage.id}/material-invoices`,
      headers: { cookie: data.outsider.cookie },
    });
    expect(hidden.statusCode).toBe(404);
  });

  it('атомарно ограничивает этап десятью счетами', async () => {
    const data = await fixture();
    const invoiceFiles = await Promise.all(Array.from({ length: 11 }, () => uploadedInvoiceFile(data.manager.user.id)));
    for (const file of invoiceFiles.slice(0, 9)) {
      const created = await createInvoice(data.stage.id, file.id, 10_000, data.manager.cookie);
      expect(created.statusCode, created.body).toBe(201);
    }

    const competing = await Promise.all(
      invoiceFiles.slice(9).map((file) => createInvoice(data.stage.id, file.id, 10_000, data.manager.cookie)),
    );
    expect(competing.map(({ statusCode }) => statusCode).sort()).toEqual([201, 409]);
    expect(competing.find(({ statusCode }) => statusCode === 409)!.json()).toMatchObject({
      code: 'invoice_limit_exceeded',
    });

    const listed = await getApp().inject({
      method: 'GET',
      url: `/stages/${data.stage.id}/material-invoices`,
      headers: { cookie: data.manager.cookie },
    });
    expect(listed.json<StageMaterialInvoice[]>()).toHaveLength(10);
  });

  it('проверяет лимит файла счёта при привязке к этапу', async () => {
    const data = await fixture();
    const boundary = await uploadedInvoiceFile(data.manager.user.id, 'application/pdf', 10 * 1024 * 1024);
    const oversized = await uploadedInvoiceFile(data.manager.user.id, 'application/pdf', 10 * 1024 * 1024 + 1);

    expect((await createInvoice(data.stage.id, boundary.id, 10_000, data.manager.cookie)).statusCode).toBe(201);
    const rejected = await createInvoice(data.stage.id, oversized.id, 10_000, data.manager.cookie);
    expect(rejected.statusCode).toBe(413);
    expect(rejected.json()).toMatchObject({ code: 'file_too_large' });
  });
});
