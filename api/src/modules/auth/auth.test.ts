import { randomUUID } from 'node:crypto';

import fastifyRateLimit from '@fastify/rate-limit';
import { eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { parseEnvironment } from '#app/config/env';
import { users } from '#app/db/schema/users';
import type { Session } from '#app/generated/types.gen';
import { authModule } from '#app/modules/auth/index';
import { hashPassword } from '#app/modules/auth/password-hasher';
import { UserRepository } from '#app/modules/users/repository';
import { registerAuthentication } from '#app/plugins/authentication';
import { registerErrorHandler } from '#app/plugins/error-handler';
import { setupModuleTest } from '#test/setup-module-test';

const PASSWORD = 'Correct-password-123!';
const createdUserIds: number[] = [];
let passwordHash: string;

function createTestModule(loginRateLimitMax: number): FastifyPluginAsync {
  return async (app) => {
    const environment = parseEnvironment({
      NODE_ENV: 'test',
      DATABASE_URL: process.env.DATABASE_URL,
      CORS_ORIGIN: 'http://localhost:5173',
      LOG_LEVEL: 'silent',
    });

    registerErrorHandler(app, environment);
    await app.register(fastifyRateLimit, { global: false });
    await registerAuthentication(app);
    await app.register(authModule, {
      SESSION_TTL_HOURS: 12,
      LOGIN_RATE_LIMIT_MAX: loginRateLimitMax,
      LOGIN_RATE_LIMIT_TIME_WINDOW: '1 minute',
    });
  };
}

const getApp = setupModuleTest(createTestModule(100));
const getLimitedApp = setupModuleTest(createTestModule(1));

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

afterEach(async () => {
  if (createdUserIds.length === 0) {
    return;
  }

  await getApp().db.delete(users).where(inArray(users.id, createdUserIds));
  createdUserIds.length = 0;
});

async function createUser(options: { isActive?: boolean } = {}) {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 20);
  const user = await new UserRepository(getApp().db).create({
    login: `login.${suffix}`,
    passwordHash,
    fullName: 'Пользователь Auth API',
    role: 'manager',
  });
  createdUserIds.push(user.id);

  if (options.isActive === false) {
    await getApp().db.update(users).set({ isActive: false }).where(eq(users.id, user.id));
    return { ...user, isActive: false };
  }

  return user;
}

const unauthorizedResponse = {
  error: 'Unauthorized',
  code: 'unauthenticated',
  message: 'Не удалось подтвердить авторизацию.',
};

describe('Auth API', () => {
  it('создаёт сессию только при верном пароле активного пользователя', async () => {
    const user = await createUser();
    const response = await getApp().inject({
      method: 'POST',
      url: '/auth/login',
      payload: { login: user.login, password: PASSWORD },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const session = response.json<Session>();
    expect(session).toMatchObject({
      tokenType: 'Bearer',
      user: { id: user.id, login: user.login, isActive: true },
    });
    expect(session.accessToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(response.body).not.toContain('password');
    expect(response.body).not.toContain('tokenHash');
  });

  it('возвращает одинаковый 401 для неизвестного логина, неверного пароля и неактивной записи', async () => {
    const activeUser = await createUser();
    const inactiveUser = await createUser({ isActive: false });
    const attempts = [
      { login: `missing.${randomUUID().replaceAll('-', '').slice(0, 20)}`, password: PASSWORD },
      { login: activeUser.login, password: 'Wrong-password-123!' },
      { login: inactiveUser.login, password: PASSWORD },
    ];

    for (const payload of attempts) {
      const response = await getApp().inject({ method: 'POST', url: '/auth/login', payload });
      expect(response.statusCode).toBe(401);
      expect(response.headers['www-authenticate']).toBe('Bearer');
      expect(response.json()).toEqual(unauthorizedResponse);
    }
  });

  it('проверяет тело запроса по zLoginBody', async () => {
    const response = await getApp().inject({ method: 'POST', url: '/auth/login', payload: {} });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'invalid_request' });
  });

  it('возвращает актуальный безопасный профиль из /auth/me', async () => {
    const user = await createUser();
    const loginResponse = await getApp().inject({
      method: 'POST',
      url: '/auth/login',
      payload: { login: user.login, password: PASSWORD },
    });
    const { accessToken } = loginResponse.json<Session>();

    await getApp().db.update(users).set({ fullName: 'Обновлённое имя' }).where(eq(users.id, user.id));
    const response = await getApp().inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: user.id, fullName: 'Обновлённое имя' });
    expect(response.body).not.toContain('password');
    expect(response.body).not.toContain('tokenHash');
  });

  it('отзывает только предъявленную сессию при logout', async () => {
    const user = await createUser();
    const issue = async () => {
      const response = await getApp().inject({
        method: 'POST',
        url: '/auth/login',
        payload: { login: user.login, password: PASSWORD },
      });
      return response.json<Session>().accessToken;
    };
    const firstToken = await issue();
    const secondToken = await issue();

    const logoutResponse = await getApp().inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: `Bearer ${firstToken}` },
    });
    expect(logoutResponse.statusCode).toBe(204);
    expect(logoutResponse.body).toBe('');

    const revokedResponse = await getApp().inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${firstToken}` },
    });
    expect(revokedResponse.statusCode).toBe(401);

    const activeResponse = await getApp().inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${secondToken}` },
    });
    expect(activeResponse.statusCode).toBe(200);
  });

  it('ограничивает попытки входа независимо по IP и нормализованному логину', async () => {
    const loginA = `limit.a.${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    const loginB = `limit.b.${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    await getLimitedApp().inject({
      method: 'POST',
      url: '/auth/login',
      remoteAddress: '192.0.2.10',
      payload: { login: loginA, password: 'wrong' },
    });
    const ipLimited = await getLimitedApp().inject({
      method: 'POST',
      url: '/auth/login',
      remoteAddress: '192.0.2.10',
      payload: { login: loginB, password: 'wrong' },
    });

    expect(ipLimited.statusCode).toBe(429);
    expect(ipLimited.headers['retry-after']).toBeDefined();
    expect(ipLimited.json()).toMatchObject({ code: 'rate_limited' });

    const sharedLogin = `limit.c.${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    await getLimitedApp().inject({
      method: 'POST',
      url: '/auth/login',
      remoteAddress: '192.0.2.20',
      payload: { login: sharedLogin, password: 'wrong' },
    });
    const loginLimited = await getLimitedApp().inject({
      method: 'POST',
      url: '/auth/login',
      remoteAddress: '192.0.2.30',
      payload: { login: sharedLogin, password: 'wrong' },
    });

    expect(loginLimited.statusCode).toBe(429);
    expect(loginLimited.headers['retry-after']).toBeDefined();
  });
});
