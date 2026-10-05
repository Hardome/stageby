import { createHash, randomUUID } from 'node:crypto';

import { eq, inArray } from 'drizzle-orm';
import type { InjectOptions } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '#app/app';
import { parseEnvironment } from '#app/config/env';
import { files } from '#app/db/schema/files';
import { projects } from '#app/db/schema/projects';
import { users } from '#app/db/schema/users';
import type {
  Checklist,
  FileDownload,
  FileUpload,
  Project,
  Stage,
  StageMaterialInvoice,
  StagePage,
} from '#app/generated/types.gen';
import { hashPassword } from '#app/modules/auth/password-hasher';
import { calendarDate } from '#app/modules/dashboard/calendar';
import { UserRepository } from '#app/modules/users/repository';
import { S3FileStorage } from '#app/storage/s3-file-storage';

const origin = 'http://localhost:5173';
const environment = parseEnvironment({
  ...process.env,
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  CORS_ORIGIN: origin,
  S3_CREATE_BUCKET: 'true',
  RATE_LIMIT_MAX: '1000',
});
const storage = new S3FileStorage(environment);
const userIds: number[] = [];
const projectIds: number[] = [];
const fileIds: number[] = [];
const storageKeys: string[] = [];
let app: Awaited<ReturnType<typeof buildApp>>;
let managerCookie: string;
let foremanCookie: string;
let foremanId: number;

async function request<T>(cookie: string, options: InjectOptions, status = 200): Promise<T> {
  const response = await app.inject({ ...options, headers: { origin, cookie, ...options.headers } });
  if (response.statusCode !== status)
    throw new Error(`HTTP ${response.statusCode}, expected ${status}: ${response.body}`);
  return response.json<T>();
}

beforeAll(async () => {
  app = await buildApp({ environment });
  await app.ready();
  const password = 'Release-password-123!';
  const passwordHash = await hashPassword(password);
  for (const role of ['manager', 'foreman'] as const) {
    const user = await new UserRepository(app.db).create({
      login: `release.${randomUUID().replaceAll('-', '')}`,
      fullName: 'Проверка выпуска',
      role,
      passwordHash,
    });
    userIds.push(user.id);
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { origin },
      payload: { login: user.login, password },
    });
    if (response.statusCode !== 200) throw new Error(`Login failed: ${response.body}`);
    const header = response.headers['set-cookie'];
    const cookie = (Array.isArray(header) ? header[0] : header)!.split(';', 1)[0]!;
    if (role === 'manager') managerCookie = cookie;
    else {
      foremanCookie = cookie;
      foremanId = user.id;
    }
  }
});

afterAll(async () => {
  try {
    for (const key of storageKeys) await storage.delete(key);
    if (app) {
      if (projectIds.length > 0) await app.db.delete(projects).where(inArray(projects.id, projectIds));
      if (fileIds.length > 0) await app.db.delete(files).where(inArray(files.id, fileIds));
      if (userIds.length > 0) await app.db.delete(users).where(inArray(users.id, userIds));
    }
  } finally {
    await app?.close();
  }
});

async function upload(cookie: string, purpose: 'material_invoice' | 'checklist_photo', mimeType: string, body: Buffer) {
  const checksumSha256 = createHash('sha256').update(body).digest('hex');
  const value = await request<FileUpload>(
    cookie,
    {
      method: 'POST',
      url: '/file-uploads',
      payload: {
        purpose,
        originalName: mimeType === 'application/pdf' ? 'invoice.pdf' : 'photo.jpg',
        mimeType,
        sizeBytes: body.length,
        checksumSha256,
      },
    },
    201,
  );
  fileIds.push(value.fileId);
  const [row] = await app.db.select().from(files).where(eq(files.id, value.fileId));
  storageKeys.push(row!.storageKey);
  const stored = await fetch(value.uploadUrl, { method: 'PUT', headers: value.headers, body });
  if (stored.status !== 200) throw new Error(`Storage upload failed: ${stored.status} ${await stored.text()}`);
  const options: InjectOptions = {
    method: 'POST',
    url: `/file-uploads/${value.fileId}/completion`,
    headers: { 'idempotency-key': randomUUID() },
    payload: { checksumSha256 },
  };
  const completed = await request(cookie, options);
  const repeated = await request(cookie, options);
  return { fileId: value.fileId, completed, repeated };
}

describe('Проверка выпуска через HTTP, PostgreSQL и MinIO', () => {
  it('проходит создание, реальные счета, фото, приёмку и выплаты с одинаковыми итогами', {
    timeout: 90_000,
  }, async () => {
    const today = calendarDate();
    const creation: InjectOptions = {
      method: 'POST',
      url: '/projects',
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        ownerName: 'Клиент проверки выпуска',
        address: 'Екатеринбург',
        coordinates: { latitude: 56.84, longitude: 60.61 },
        plannedStartDate: today,
        plannedEndDate: today,
        documentFileIds: [],
        stages: [
          {
            type: 'foundation',
            plannedStartDate: today,
            plannedEndDate: today,
            assigneeId: foremanId,
            plannedWorkAmountMinor: 10_000,
            plannedMaterialAmountMinor: 20_000,
            checklistItems: [{ title: 'Проверка с фото', photoHint: 'Общий вид' }],
          },
        ],
      },
    };
    const project = await request<Project>(managerCookie, creation, 201);
    projectIds.push(project.id);
    expect((await request<Project>(managerCookie, creation, 201)).id).toBe(project.id);
    const page = await request<StagePage>(managerCookie, { url: `/stages?projectId=${project.id}` });
    const stageId = page.items[0]!.id;
    const readStage = () => request<Stage>(managerCookie, { url: `/stages/${stageId}` });
    expect(await request(foremanCookie, { url: `/projects/${project.id}` }, 403)).toMatchObject({ code: 'forbidden' });
    expect(
      await request<StageMaterialInvoice[]>(managerCookie, { url: `/stages/${stageId}/material-invoices` }),
    ).toEqual([]);

    const invoices: StageMaterialInvoice[] = [];
    for (const mimeType of ['application/pdf', 'image/jpeg']) {
      const body = Buffer.alloc(10 * 1024 * 1024, 1);
      const uploaded = await upload(managerCookie, 'material_invoice', mimeType, body);
      expect(uploaded.repeated).toEqual(uploaded.completed);
      const fileId = uploaded.fileId;
      const invoice = await request<StageMaterialInvoice>(
        managerCookie,
        {
          method: 'POST',
          url: `/stages/${stageId}/material-invoices`,
          payload: { fileId, amountMinor: 10_000 },
        },
        201,
      );
      invoices.push(invoice);
      const download = await request<FileDownload>(foremanCookie, { url: `/files/${fileId}/content` });
      const content = await fetch(download.downloadUrl);
      expect(content.status).toBe(200);
      expect(Buffer.from(await content.arrayBuffer()).equals(body)).toBe(true);
    }
    expect((await readStage()).actualMaterialAmountMinor).toBe(0);
    const invalidInvoice = await app.inject({
      method: 'POST',
      url: `/stages/${stageId}/material-invoices`,
      headers: { origin, cookie: managerCookie },
      payload: { fileId: 2_147_483_647, amountMinor: 10_000 },
    });
    expect(invalidInvoice.statusCode).toBe(400);
    expect((await request<Project>(managerCookie, { url: `/projects/${project.id}` })).id).toBe(project.id);
    for (const invoice of invoices) {
      await request(managerCookie, {
        method: 'PATCH',
        url: `/material-invoices/${invoice.id}`,
        payload: { expectedVersion: invoice.version, isPaid: true, isDelivered: true },
      });
    }

    const checklist = await request<Checklist>(foremanCookie, { url: `/stages/${stageId}/checklist` });
    const itemId = checklist.items[0]!.id;
    const photo = await upload(foremanCookie, 'checklist_photo', 'image/jpeg', Buffer.from('release-photo'));
    expect(photo.repeated).toEqual(photo.completed);
    const attachment: InjectOptions = {
      method: 'POST',
      url: `/checklist/items/${itemId}/photos`,
      payload: { fileId: photo.fileId },
    };
    const attached = await request(foremanCookie, attachment, 201);
    expect(await request(foremanCookie, attachment, 201)).toEqual(attached);
    const withPhoto = await request<Checklist>(foremanCookie, { url: `/stages/${stageId}/checklist` });
    expect(withPhoto).toMatchObject({ progressPercent: 0, items: [{ isCompleted: false, photoCount: 1 }] });
    const ready = await request<Checklist>(foremanCookie, {
      method: 'PATCH',
      url: `/stages/${stageId}/checklist/items/${itemId}`,
      payload: { expectedVersion: withPhoto.version, isCompleted: true },
    });
    expect(ready.progressPercent).toBe(100);
    const awaiting = await readStage();
    expect(awaiting.status).toBe('acceptance');
    const accepted = await request<Stage>(managerCookie, {
      method: 'POST',
      url: `/stages/${stageId}/acceptance`,
      payload: { expectedVersion: awaiting.version },
    });
    expect(accepted.status).toBe('completed');
    for (const amountMinor of [4000, 7000]) {
      await request(
        managerCookie,
        {
          method: 'POST',
          url: `/stages/${stageId}/work-payments`,
          payload: { paidAt: today, amountMinor, recipientId: foremanId },
        },
        201,
      );
    }
    const paidStage = await readStage();
    expect(paidStage).toMatchObject({
      actualWorkAmountMinor: 11_000,
      workBalanceAmountMinor: -1000,
      actualMaterialAmountMinor: 20_000,
      totalPlannedAmountMinor: 30_000,
      totalActualAmountMinor: 31_000,
      status: 'completed',
    });
    const card = await request<Project>(managerCookie, { url: `/projects/${project.id}` });
    expect(card.finances).toMatchObject({ totalPlannedAmountMinor: 30_000, totalActualAmountMinor: 31_000 });
    expect(await request(managerCookie, { url: `/dashboard/summary?through=${today}` })).toMatchObject({
      activeProjectCount: 1,
      works: { plannedAmountMinor: 10_000, actualAmountMinor: 11_000, balanceAmountMinor: -1000 },
      materials: { plannedAmountMinor: 20_000, actualAmountMinor: 20_000, balanceAmountMinor: 0 },
      total: { plannedAmountMinor: 30_000, actualAmountMinor: 31_000, balanceAmountMinor: -1000 },
    });
    await request(managerCookie, {
      method: 'PUT',
      url: `/stages/${stageId}/status`,
      payload: { expectedVersion: paidStage.version, status: 'paid' },
    });
    expect((await request<Project>(managerCookie, { url: `/projects/${project.id}` })).status).toBe('completed');
    expect(await request(managerCookie, { url: '/dashboard/summary' })).toMatchObject({
      activeProjectCount: 0,
      total: { actualAmountMinor: 31_000 },
    });
  });
});
