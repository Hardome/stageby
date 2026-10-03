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
import type { MaterialInvoice, MaterialOrder, MaterialShortage, Project, Stage } from '#app/generated/types.gen';
import { hashPassword } from '#app/modules/auth/password-hasher';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { materialModule } from '#app/modules/materials/index';
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
    headers: { cookie: manager.cookie },
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
          canRunInParallel: false,
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

async function uploadedInvoiceFile(userId: number, mimeType = 'application/pdf') {
  const uploadedAt = new Date();
  const [file] = await getApp()
    .db.insert(files)
    .values({
      status: 'uploaded',
      purpose: 'material_invoice',
      storageKey: `tests/materials/${randomUUID()}`,
      originalName: mimeType === 'application/pdf' ? 'invoice.pdf' : 'invoice.jpg',
      mimeType,
      sizeBytes: 1024,
      checksumSha256: randomUUID().replaceAll('-', '').repeat(2),
      uploadedByUserId: userId,
      uploadExpiresAt: uploadedAt,
      uploadedAt,
    })
    .returning();
  createdFileIds.push(file!.id);
  return file!;
}

async function createOrder(stageId: number, cookie: string) {
  const response = await getApp().inject({
    method: 'POST',
    url: `/stages/${stageId}/material-orders`,
    headers: { cookie },
  });
  if (response.statusCode !== 201) throw new Error(`Не удалось создать заказ: ${response.body}`);
  return response.json<MaterialOrder>();
}

async function createInvoice(orderId: number, fileId: number, amountMinor: number, cookie: string) {
  return getApp().inject({
    method: 'POST',
    url: `/material-orders/${orderId}/invoices`,
    headers: { cookie },
    payload: { fileId, amountMinor, supplierName: 'Стройснаб' },
  });
}

describe('Материалы, счета и нехватки', () => {
  it('учитывает несколько заказов и счетов, оплату и доставку независимо', async () => {
    const data = await fixture();
    const planned = await getApp().inject({
      method: 'PATCH',
      url: `/stages/${data.stage.id}`,
      headers: { cookie: data.manager.cookie },
      payload: { expectedVersion: 1, plannedMaterialAmountMinor: 120_000 },
    });
    expect(planned.statusCode, planned.body).toBe(200);
    expect(planned.json<Stage>().plannedMaterialAmountMinor).toBe(120_000);
    const firstOrder = await createOrder(data.stage.id, data.manager.cookie);
    const secondOrder = await createOrder(data.stage.id, data.manager.cookie);
    const fileIds = await Promise.all([
      uploadedInvoiceFile(data.manager.user.id),
      uploadedInvoiceFile(data.manager.user.id, 'image/jpeg'),
      uploadedInvoiceFile(data.manager.user.id),
    ]);
    const first = await createInvoice(firstOrder.id, fileIds[0]!.id, 10_000, data.manager.cookie);
    const second = await createInvoice(firstOrder.id, fileIds[1]!.id, 20_000, data.manager.cookie);
    const third = await createInvoice(secondOrder.id, fileIds[2]!.id, 30_000, data.manager.cookie);
    expect([first.statusCode, second.statusCode, third.statusCode]).toEqual([201, 201, 201]);
    const invoices = [first.json<MaterialInvoice>(), second.json<MaterialInvoice>(), third.json<MaterialInvoice>()];

    let stage = await getApp().inject({
      method: 'GET',
      url: `/stages/${data.stage.id}`,
      headers: { cookie: data.manager.cookie },
    });
    expect(stage.json<Stage>()).toMatchObject({
      actualMaterialAmountMinor: 0,
      totalActualAmountMinor: 0,
      materialSummary: { orderCount: 2, invoiceCount: 3, deliveredInvoiceCount: 0, openShortageCount: 0 },
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
    const order = await createOrder(data.stage.id, data.manager.cookie);
    const file = await uploadedInvoiceFile(data.manager.user.id);
    const created = await createInvoice(order.id, file.id, 10_000, data.manager.cookie);
    const invoice = created.json<MaterialInvoice>();
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
    expect((await createInvoice(order.id, secondFile.id, 20_000, data.manager.cookie)).statusCode).toBe(201);
    const orders = await getApp().inject({
      method: 'GET',
      url: `/stages/${data.stage.id}/material-orders`,
      headers: { cookie: data.foreman.cookie },
    });
    const current = orders.json<MaterialOrder[]>()[0]!.invoices[0]!.shortages[0]!;
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
    const order = await createOrder(data.stage.id, data.manager.cookie);
    const missingFile = await createInvoice(order.id, 2_147_483_647, 10_000, data.manager.cookie);
    const missingAmount = await getApp().inject({
      method: 'POST',
      url: `/material-orders/${order.id}/invoices`,
      headers: { cookie: data.manager.cookie },
      payload: { fileId: 1 },
    });
    expect(missingFile.statusCode).toBe(400);
    expect(missingAmount.statusCode).toBe(400);
    const hidden = await getApp().inject({
      method: 'GET',
      url: `/stages/${data.stage.id}/material-orders`,
      headers: { cookie: data.outsider.cookie },
    });
    expect(hidden.statusCode).toBe(404);
  });
});
