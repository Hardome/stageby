import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '#app/app';
import { type Environment, parseEnvironment } from '#app/config/env';
import { todos } from '#app/db/schema/todos';

let app: Awaited<ReturnType<typeof buildApp>>;
let environment: Environment;

beforeAll(async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('Для тестов приложения требуется DATABASE_URL. Запустите PostgreSQL.');
  }

  environment = parseEnvironment({
    ...process.env,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    CORS_ORIGIN: 'http://localhost:5173',
    RATE_LIMIT_MAX: '100',
    RATE_LIMIT_TIME_WINDOW: '1 minute',
  });

  app = await buildApp({ environment });
  await app.ready();

  try {
    await app.db.execute(sql`select 1`);
  } catch (cause) {
    throw new Error('PostgreSQL недоступен для тестов приложения.', { cause });
  }
});

afterAll(async () => {
  await app?.close();
});

describe('Приложение', () => {
  it('отдаёт контракт OpenAPI', async () => {
    const response = await app.inject({ method: 'GET', url: '/documentation/json' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      openapi: '3.1.0',
      info: { title: 'Stageby API', version: '0.0.0' },
      paths: { '/todos': {}, '/todos/{id}': {} },
    });
  });

  it('добавляет заголовки CORS и защиты', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/todos/${randomUUID()}`,
      headers: { origin: 'http://localhost:5173' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('подключает БД к модулю', async () => {
    const rows = await app.db.select().from(todos).limit(1);
    expect(Array.isArray(rows)).toBe(true);

    const response = await app.inject({ method: 'GET', url: `/todos/${randomUUID()}` });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Не найдено', message: 'Задача не найдена' });
  });

  it('оформляет ошибки проверки данных через общий обработчик', async () => {
    const response = await app.inject({ method: 'POST', url: '/todos', payload: {} });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      error: 'Некорректный запрос',
      message: 'Ошибка проверки данных запроса',
    });
  });

  it('ограничивает число запросов', async () => {
    const limitedApp = await buildApp({
      environment: { ...environment, RATE_LIMIT_MAX: 1 },
    });

    try {
      const url = `/todos/${randomUUID()}`;
      const first = await limitedApp.inject({ method: 'GET', url });
      const second = await limitedApp.inject({ method: 'GET', url });

      expect(first.statusCode).toBe(404);
      expect(second.statusCode).toBe(429);
      expect(second.json()).toMatchObject({
        error: 'Слишком много запросов',
        message: 'Превышен лимит запросов',
      });
    } finally {
      await limitedApp.close();
    }
  });
});
