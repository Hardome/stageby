import { randomUUID } from 'node:crypto';

import { eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { users } from '#app/db/schema/users';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { UserRepository } from '#app/modules/users/repository';
import { registerAuthentication } from '#app/plugins/authentication';
import { setupModuleTest } from '#test/setup-module-test';

const authenticationTestModule: FastifyPluginAsync = async (app) => {
  await registerAuthentication(app);

  app.get('/test/public', async (request) => ({ auth: request.auth }));
  app.get('/test/protected', { preHandler: app.authenticate }, async (request) => request.auth);
  app.get('/test/manager', { preHandler: [app.authenticate, app.requireRoles('manager')] }, async () => ({
    allowed: true,
  }));
  app.get(
    '/test/manager-or-estimator',
    { preHandler: [app.authenticate, app.requireRoles('manager', 'estimator')] },
    async () => ({ allowed: true }),
  );
  app.get('/test/role-without-authentication', { preHandler: app.requireRoles('manager') }, async () => ({
    allowed: true,
  }));
};

const getApp = setupModuleTest(authenticationTestModule);
const createdUserIds: number[] = [];

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await getApp().db.delete(users).where(inArray(users.id, createdUserIds));
    createdUserIds.length = 0;
  }
});

async function createAuthenticatedUser(role: 'manager' | 'estimator' | 'foreman' | 'inspector' = 'manager') {
  const app = getApp();
  const suffix = randomUUID().replaceAll('-', '').slice(0, 20);
  const user = await new UserRepository(app.db).create({
    login: `auth.${suffix}`,
    passwordHash: 'authentication-plugin-test-hash',
    fullName: 'Пользователь проверки авторизации',
    role,
  });
  createdUserIds.push(user.id);

  const sessionRepository = new SessionRepository(app.db);
  const issued = await new SessionService(sessionRepository, 12).issue(user.id);
  return { user, issued, sessionRepository };
}

describe('Плагин аутентификации', () => {
  it('оставляет контекст пустым на публичном маршруте', async () => {
    const response = await getApp().inject({ method: 'GET', url: '/test/public' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ auth: null });
  });

  it('отклоняет отсутствующий или некорректный Bearer-токен единым ответом', async () => {
    const headers = [undefined, 'Basic credentials', 'Bearer invalid', 'Bearer  token', 'Bearer token extra'];

    for (const authorization of headers) {
      const response = await getApp().inject({
        method: 'GET',
        url: '/test/protected',
        ...(authorization ? { headers: { authorization } } : {}),
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers['www-authenticate']).toBe('Bearer');
      expect(response.json()).toEqual({
        error: 'Unauthorized',
        code: 'unauthenticated',
        message: 'Не удалось подтвердить авторизацию.',
      });
    }
  });

  it('создаёт безопасный типизированный контекст для действующей сессии', async () => {
    const { user, issued } = await createAuthenticatedUser();
    const response = await getApp().inject({
      method: 'GET',
      url: '/test/protected',
      headers: { authorization: `bEaReR ${issued.accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      user: { id: user.id, login: user.login, role: 'manager', isActive: true },
      session: { id: issued.session.id, userId: user.id },
    });
    expect(response.body).not.toContain('passwordHash');
    expect(response.body).not.toContain('tokenHash');
    expect(response.body).not.toContain('revokedAt');
  });

  it('отклоняет истёкшую, отозванную или принадлежащую неактивному пользователю сессию', async () => {
    const revokedIdentity = await createAuthenticatedUser();
    await revokedIdentity.sessionRepository.revokeByTokenHash(revokedIdentity.issued.session.tokenHash);

    const inactiveIdentity = await createAuthenticatedUser();
    await getApp().db.update(users).set({ isActive: false }).where(eq(users.id, inactiveIdentity.user.id));

    const expiredIdentity = await createAuthenticatedUser();
    const expiredIssueTime = new Date(Date.now() - 13 * 60 * 60 * 1000);
    const expiredSession = await new SessionService(expiredIdentity.sessionRepository, 12).issue(
      expiredIdentity.user.id,
      expiredIssueTime,
    );

    for (const accessToken of [
      revokedIdentity.issued.accessToken,
      inactiveIdentity.issued.accessToken,
      expiredSession.accessToken,
    ]) {
      const response = await getApp().inject({
        method: 'GET',
        url: '/test/protected',
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ code: 'unauthenticated' });
    }
  });

  it('проверяет актуальную роль пользователя при каждом запросе', async () => {
    const identity = await createAuthenticatedUser('manager');
    const headers = { authorization: `Bearer ${identity.issued.accessToken}` };

    const managerResponse = await getApp().inject({ method: 'GET', url: '/test/manager', headers });
    expect(managerResponse.statusCode).toBe(200);

    await getApp().db.update(users).set({ role: 'estimator' }).where(eq(users.id, identity.user.id));

    const forbiddenResponse = await getApp().inject({ method: 'GET', url: '/test/manager', headers });
    expect(forbiddenResponse.statusCode).toBe(403);
    expect(forbiddenResponse.json()).toEqual({
      error: 'Forbidden',
      code: 'forbidden',
      message: 'Недостаточно прав для выполнения операции.',
    });

    const estimatorResponse = await getApp().inject({ method: 'GET', url: '/test/manager-or-estimator', headers });
    expect(estimatorResponse.statusCode).toBe(200);
  });

  it('закрывает role guard, если перед ним забыли выполнить аутентификацию', async () => {
    const response = await getApp().inject({ method: 'GET', url: '/test/role-without-authentication' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: 'unauthenticated' });
  });
});
