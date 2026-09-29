import { randomUUID } from 'node:crypto';
import { Writable } from 'node:stream';

import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '#app/app';
import { type Environment, parseEnvironment } from '#app/config/env';
import { todos } from '#app/db/schema/todos';
import { users } from '#app/db/schema/users';
import { hashPassword } from '#app/modules/auth/password-hasher';
import { UserRepository } from '#app/modules/users/repository';

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
      info: { title: 'Stageby API', version: '0.1.0' },
      servers: [{ url: '/' }],
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
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('отклоняет изменяющие запросы с посторонним Origin', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/todos',
      headers: { origin: 'https://attacker.example' },
      payload: { title: 'CSRF' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'forbidden' });
  });

  it('разрешает изменяющие запросы из Swagger UI на том же host', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { host: '127.0.0.1:3001', origin: 'http://127.0.0.1:3001' },
      payload: { login: 'swagger.missing', password: 'wrong' },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'unauthenticated' });
  });

  it('подключает БД к модулю', async () => {
    const rows = await app.db.select().from(todos).limit(1);
    expect(Array.isArray(rows)).toBe(true);

    const response = await app.inject({ method: 'GET', url: `/todos/${randomUUID()}` });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Not Found', code: 'not_found', message: 'Задача не найдена' });
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

  it('не пишет пароль, хеш и сессионный токен в журналы', async () => {
    const logChunks: string[] = [];
    const loggerStream = new Writable({
      write(chunk, _encoding, callback) {
        logChunks.push(String(chunk));
        callback();
      },
    });
    const loggedApp = await buildApp({
      environment: { ...environment, NODE_ENV: 'production', LOG_LEVEL: 'info' },
      loggerStream,
    });
    const password = 'Log-safety-password-123!';
    const passwordHash = await hashPassword(password);
    const user = await new UserRepository(loggedApp.db).create({
      login: `logs.${randomUUID().replaceAll('-', '').slice(0, 20)}`,
      passwordHash,
      fullName: 'Проверка журналов',
      role: 'manager',
    });

    try {
      const response = await loggedApp.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { login: user.login, password },
      });
      const cookieHeader = response.headers['set-cookie'];
      const cookie = (Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader)?.split(';', 1)[0] ?? '';
      const token = cookie.slice(cookie.indexOf('=') + 1);
      const logs = logChunks.join('');

      expect(response.statusCode).toBe(200);
      expect(token).not.toBe('');
      expect(logs).not.toContain(password);
      expect(logs).not.toContain(passwordHash);
      expect(logs).not.toContain(token);
      expect(logs).not.toContain('tokenHash');
    } finally {
      await loggedApp.db.delete(users).where(eq(users.id, user.id));
      await loggedApp.close();
    }
  });
});
