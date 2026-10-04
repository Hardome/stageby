import { randomUUID } from 'node:crypto';

import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';
import { eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { parseEnvironment } from '#app/config/env';
import { auditChanges, auditEvents } from '#app/db/schema/audit';
import { users } from '#app/db/schema/users';
import type { Session } from '#app/generated/types.gen';
import { authModule } from '#app/modules/auth/index';
import { hashPassword } from '#app/modules/auth/password-hasher';
import { userModule } from '#app/modules/users/index';
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
    await app.register(fastifyCookie);
    await app.register(fastifyRateLimit, { global: false });
    await registerAuthentication(app);
    await app.register(authModule, {
      NODE_ENV: 'test',
      SESSION_TTL_HOURS: 12,
      LOGIN_RATE_LIMIT_MAX: loginRateLimitMax,
      LOGIN_RATE_LIMIT_TIME_WINDOW: '1 minute',
    });
    await app.register(userModule);
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

function getSessionCookie(response: Awaited<ReturnType<ReturnType<typeof getApp>['inject']>>): string {
  const header = response.headers['set-cookie'];
  const serializedCookie = Array.isArray(header) ? header[0] : header;

  if (!serializedCookie) {
    throw new Error('Ответ не установил сессионную cookie');
  }

  return serializedCookie.split(';', 1)[0] ?? '';
}

describe('Auth API', () => {
  it('принимает публичный запрос без раскрытия логина, сохраняет одну отметку и закрывает её при смене пароля', async () => {
    const target = await createUser();
    const manager = await createUser();
    const inactive = await createUser({ isActive: false });
    const requestReset = (login: string) =>
      getApp().inject({ method: 'POST', url: '/auth/password-reset-requests', payload: { login } });
    const login = async (user: typeof target) => {
      const response = await getApp().inject({
        method: 'POST',
        url: '/auth/login',
        payload: { login: user.login, password: PASSWORD },
      });
      expect(response.statusCode, response.body).toBe(200);
      return getSessionCookie(response);
    };
    const targetCookie = await login(target);
    const managerCookie = await login(manager);
    const first = await requestReset(target.login);
    const repeated = await requestReset(target.login);
    const unknown = await requestReset('unknown.login');
    const disabled = await requestReset(inactive.login);
    for (const response of [first, repeated, unknown, disabled]) {
      expect(response.statusCode, response.body).toBe(202);
      expect(response.body).toBe('');
      expect(response.headers['cache-control']).toBe('no-store');
    }
    const [pending] = await getApp().db.select().from(users).where(eq(users.id, target.id));
    expect(pending!.passwordResetRequestedAt).toBeInstanceOf(Date);
    const list = await getApp().inject({ url: `/users?search=${target.login}`, headers: { cookie: managerCookie } });
    expect(list.statusCode, list.body).toBe(200);
    expect(list.json().items[0].passwordResetRequestedAt).toBe(pending!.passwordResetRequestedAt!.toISOString());
    const requests = await getApp()
      .db.select({ change: auditChanges, event: auditEvents })
      .from(auditChanges)
      .innerJoin(auditEvents, eq(auditChanges.eventId, auditEvents.id))
      .where(eq(auditEvents.operation, 'requestPasswordReset'));
    const recorded = requests.filter((row) => row.change.after?.id === target.id);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]!.event).toMatchObject({ source: 'api', actorUserId: null, requestId: expect.any(String) });
    const password = await getApp().inject({
      method: 'PUT',
      url: `/users/${target.id}/password`,
      headers: { cookie: managerCookie },
      payload: { password: 'Replacement-password-456!' },
    });
    expect(password.statusCode, password.body).toBe(204);
    const [closed] = await getApp().db.select().from(users).where(eq(users.id, target.id));
    expect(closed!.passwordResetRequestedAt).toBeNull();
    expect((await getApp().inject({ url: '/auth/me', headers: { cookie: targetCookie } })).statusCode).toBe(401);
    const changed = await getApp()
      .db.select({ change: auditChanges })
      .from(auditChanges)
      .innerJoin(auditEvents, eq(auditChanges.eventId, auditEvents.id))
      .where(eq(auditEvents.operation, 'setUserPassword'));
    expect(changed.find((row) => row.change.after?.id === target.id)!.change).toMatchObject({
      before: { passwordResetRequestedAt: expect.any(String) },
      after: { passwordResetRequestedAt: null },
    });
    expect(JSON.stringify(changed)).not.toMatch(/passwordHash|"password"|Replacement-password/);
    const newLogin = await getApp().inject({
      method: 'POST',
      url: '/auth/login',
      payload: { login: target.login, password: 'Replacement-password-456!' },
    });
    expect(newLogin.statusCode, newLogin.body).toBe(200);
    expect(
      (
        await getApp().inject({
          method: 'POST',
          url: '/auth/login',
          payload: { login: target.login, password: PASSWORD },
        })
      ).statusCode,
    ).toBe(401);
  });

  it('проверяет и ограничивает публичные запросы сброса по IP и логину', async () => {
    const target = await createUser();
    const requestReset = (login: string, remoteAddress: string) =>
      getLimitedApp().inject({
        method: 'POST',
        url: '/auth/password-reset-requests',
        remoteAddress,
        payload: { login },
      });
    expect((await requestReset(target.login, '192.0.2.101')).statusCode).toBe(202);
    expect((await requestReset(target.login, '192.0.2.102')).statusCode).toBe(429);
    expect((await requestReset('another.login', '192.0.2.101')).statusCode).toBe(429);
    for (const payload of [{}, { login: 'bad', extra: true }, { login: '  ' }, { login: 'invalid login' }]) {
      expect(
        (await getApp().inject({ method: 'POST', url: '/auth/password-reset-requests', payload })).statusCode,
      ).toBe(400);
    }
  });

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
    expect(session).toMatchObject({ user: { id: user.id, login: user.login, isActive: true } });
    expect(response.headers['set-cookie']).toContain('stageby_session=');
    expect(response.headers['set-cookie']).toContain('HttpOnly');
    expect(response.headers['set-cookie']).toContain('SameSite=Lax');
    expect(response.headers['set-cookie']).toContain('Path=/');
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(response.body).not.toContain('"password"');
    expect(response.body).not.toContain('passwordHash');
    expect(response.body).not.toContain('accessToken');
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
    const cookie = getSessionCookie(loginResponse);

    await getApp().db.update(users).set({ fullName: 'Обновлённое имя' }).where(eq(users.id, user.id));
    const response = await getApp().inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: user.id, fullName: 'Обновлённое имя' });
    expect(response.body).not.toContain('"password"');
    expect(response.body).not.toContain('passwordHash');
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
      return getSessionCookie(response);
    };
    const firstCookie = await issue();
    const secondCookie = await issue();

    const logoutResponse = await getApp().inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { cookie: firstCookie },
    });
    expect(logoutResponse.statusCode).toBe(204);
    expect(logoutResponse.body).toBe('');
    expect(logoutResponse.headers['set-cookie']).toContain('stageby_session=;');

    const revokedResponse = await getApp().inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: firstCookie },
    });
    expect(revokedResponse.statusCode).toBe(401);

    const activeResponse = await getApp().inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie: secondCookie },
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
