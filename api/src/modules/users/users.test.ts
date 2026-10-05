import { randomUUID } from 'node:crypto';

import fastifyCookie from '@fastify/cookie';
import { eq, inArray } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { parseEnvironment } from '#app/config/env';
import { projects } from '#app/db/schema/projects';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import type { User, UserPage } from '#app/generated/types.gen';
import { hashPassword, verifyPassword } from '#app/modules/auth/password-hasher';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { hashSessionToken } from '#app/modules/auth/session-token';
import { userModule } from '#app/modules/users/index';
import { UserRepository } from '#app/modules/users/repository';
import { registerAuthentication } from '#app/plugins/authentication';
import { registerErrorHandler } from '#app/plugins/error-handler';
import { setupModuleTest } from '#test/setup-module-test';

const PASSWORD = 'Users-test-password-123!';
const NEW_PASSWORD = 'Users-new-password-456!';
const createdUserIds: number[] = [];
const createdProjectIds: number[] = [];
let passwordHash: string;

const usersTestModule: FastifyPluginAsync = async (app) => {
  const environment = parseEnvironment({
    NODE_ENV: 'test',
    DATABASE_URL: process.env.DATABASE_URL,
    CORS_ORIGIN: 'http://localhost:5173',
    LOG_LEVEL: 'silent',
  });

  registerErrorHandler(app, environment);
  await app.register(fastifyCookie);
  await registerAuthentication(app);
  await app.register(userModule);
};

const getApp = setupModuleTest(usersTestModule);

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

afterEach(async () => {
  const app = getApp();

  if (createdProjectIds.length > 0) {
    await app.db.delete(projects).where(inArray(projects.id, createdProjectIds));
    createdProjectIds.length = 0;
  }

  if (createdUserIds.length > 0) {
    await app.db.delete(users).where(inArray(users.id, createdUserIds));
    createdUserIds.length = 0;
  }
});

async function createIdentity(role: 'manager' | 'foreman' = 'manager') {
  const app = getApp();
  const suffix = randomUUID().replaceAll('-', '').slice(0, 20);
  const user = await new UserRepository(app.db).create({
    login: `users.${suffix}`,
    passwordHash,
    fullName: `Пользователь ${suffix}`,
    role,
  });
  createdUserIds.push(user.id);
  const issued = await new SessionService(new SessionRepository(app.db), 12).issue(user.id);
  return { user, accessToken: issued.accessToken, cookie: `stageby_session=${issued.accessToken}` };
}

function authentication(cookie: string) {
  return { cookie };
}

describe('Users API', () => {
  it('разрешает маршруты только активному manager', async () => {
    const unauthenticated = await getApp().inject({ method: 'GET', url: '/users' });
    expect(unauthenticated.statusCode).toBe(401);

    const foreman = await createIdentity('foreman');
    const forbidden = await getApp().inject({
      method: 'GET',
      url: '/users',
      headers: authentication(foreman.cookie),
    });
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json()).toMatchObject({ code: 'forbidden' });
  });

  it('создаёт и получает пользователя без утечки пароля и преобразует дубликат логина в 409', async () => {
    const manager = await createIdentity();
    const login = `created.${randomUUID().replaceAll('-', '').slice(0, 20)}`;
    const payload = {
      login,
      password: PASSWORD,
      fullName: 'Созданный пользователь',
      role: 'foreman' as const,
      phone: '+7 900 000-00-00',
    };
    const createdResponse = await getApp().inject({
      method: 'POST',
      url: '/users',
      headers: authentication(manager.cookie),
      payload,
    });

    expect(createdResponse.statusCode).toBe(201);
    const created = createdResponse.json<User>();
    createdUserIds.push(created.id);
    expect(created).toMatchObject({ login, isActive: true, role: 'foreman', phone: payload.phone });
    expect(createdResponse.body).not.toContain(PASSWORD);
    expect(createdResponse.body).not.toContain('passwordHash');

    const getResponse = await getApp().inject({
      method: 'GET',
      url: `/users/${created.id}`,
      headers: authentication(manager.cookie),
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toEqual(created);

    const duplicateResponse = await getApp().inject({
      method: 'POST',
      url: '/users',
      headers: authentication(manager.cookie),
      payload,
    });
    expect(duplicateResponse.statusCode, duplicateResponse.body).toBe(409);
    expect(duplicateResponse.json()).toMatchObject({ code: 'login_taken' });
  });

  it('отклоняет неподдерживаемую роль при создании, изменении и фильтрации пользователей', async () => {
    const manager = await createIdentity();
    const headers = authentication(manager.cookie);
    const login = `invalid.role.${randomUUID().replaceAll('-', '').slice(0, 10)}`;
    const creation = await getApp().inject({
      method: 'POST',
      url: '/users',
      headers,
      payload: { login, password: PASSWORD, fullName: 'Недопустимая роль', role: 'unsupported' },
    });
    const update = await getApp().inject({
      method: 'PATCH',
      url: `/users/${manager.user.id}`,
      headers,
      payload: { role: 'unsupported' },
    });
    const list = await getApp().inject({ method: 'GET', url: '/users?role=unsupported', headers });
    expect([creation.statusCode, update.statusCode, list.statusCode]).toEqual([400, 400, 400]);
    expect(await getApp().db.select().from(users).where(eq(users.login, login))).toEqual([]);
    const [unchanged] = await getApp().db.select().from(users).where(eq(users.id, manager.user.id));
    expect(unchanged!.role).toBe('manager');
  });

  it('поддерживает фильтры, поиск, пагинацию, total и стабильную сортировку', async () => {
    const manager = await createIdentity();
    const marker = randomUUID().replaceAll('-', '').slice(0, 10);
    const repository = new UserRepository(getApp().db);
    const first = await repository.create({
      login: `search.a.${marker}`,
      passwordHash,
      fullName: `Поиск ${marker}`,
      role: 'foreman',
    });
    const second = await repository.create({
      login: `search.b.${marker}`,
      passwordHash,
      fullName: `Поиск ${marker}`,
      role: 'foreman',
    });
    const excluded = await repository.create({
      login: `search.c.${marker}`,
      passwordHash,
      fullName: `Поиск ${marker}`,
      role: 'manager',
    });
    createdUserIds.push(first.id, second.id, excluded.id);

    const response = await getApp().inject({
      method: 'GET',
      url: `/users?role=foreman&isActive=true&search=${marker}&limit=1&offset=1`,
      headers: authentication(manager.cookie),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<UserPage>()).toEqual({
      items: [expect.objectContaining({ id: second.id })],
      total: 2,
      limit: 1,
      offset: 1,
    });
  });

  it('отклоняет пустое изменение и возвращает 404 для отсутствующего пользователя', async () => {
    const manager = await createIdentity();
    const headers = authentication(manager.cookie);
    const empty = await getApp().inject({ method: 'PATCH', url: `/users/${manager.user.id}`, headers, payload: {} });
    expect(empty.statusCode).toBe(400);

    const missing = await getApp().inject({ method: 'GET', url: '/users/2147483647', headers });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toMatchObject({ code: 'not_found' });
  });

  it('не позволяет двум параллельным запросам убрать последних активных managers', async () => {
    const first = await createIdentity();
    const second = await createIdentity();
    const requests = [first, second].map((identity) =>
      getApp().inject({
        method: 'PATCH',
        url: `/users/${identity.user.id}`,
        headers: authentication(identity.cookie),
        payload: { role: 'foreman' },
      }),
    );
    const responses = await Promise.all(requests);

    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 409]);
    expect(responses.find((response) => response.statusCode === 409)?.json()).toMatchObject({ code: 'last_manager' });

    const activeManagers = await getApp().db.select().from(users).where(eq(users.role, 'manager'));
    expect(activeManagers.filter((user) => user.isActive && createdUserIds.includes(user.id))).toHaveLength(1);
  });

  it('защищает назначенного пользователя правилом user_in_use и разрешает изменение после завершения этапа', async () => {
    const manager = await createIdentity();
    const foreman = await createIdentity('foreman');
    const [project] = await getApp()
      .db.insert(projects)
      .values({
        ownerName: 'Заказчик',
        address: 'Екатеринбург, ул. Тестовая, д. 1',
        latitude: 56.8389,
        longitude: 60.6057,
        plannedStartDate: '2026-01-01',
        plannedEndDate: '2026-12-31',
      })
      .returning();
    if (!project) {
      throw new Error('Не удалось создать тестовый проект');
    }
    createdProjectIds.push(project.id);
    const [stage] = await getApp()
      .db.insert(stages)
      .values({
        projectId: project.id,
        stageTypeCode: 'foundation',
        position: 1,
        plannedStartDate: '2026-01-01',
        plannedEndDate: '2026-01-31',
        assigneeId: foreman.user.id,
        status: 'in_progress',
      })
      .returning();
    if (!stage) {
      throw new Error('Не удалось создать тестовый этап');
    }

    const blocked = await getApp().inject({
      method: 'PATCH',
      url: `/users/${foreman.user.id}`,
      headers: authentication(manager.cookie),
      payload: { isActive: false },
    });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json()).toMatchObject({ code: 'user_in_use' });

    await getApp().db.update(stages).set({ status: 'completed' }).where(eq(stages.id, stage.id));
    const updated = await getApp().inject({
      method: 'PATCH',
      url: `/users/${foreman.user.id}`,
      headers: authentication(manager.cookie),
      payload: { isActive: false },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ id: foreman.user.id, isActive: false });

    await expect(
      new SessionRepository(getApp().db).findActiveByTokenHash(hashSessionToken(foreman.accessToken)),
    ).resolves.toBeNull();
  });

  it('атомарно меняет пароль и отзывает все сессии пользователя', async () => {
    const manager = await createIdentity();
    const target = await createIdentity('foreman');
    const secondSession = await new SessionService(new SessionRepository(getApp().db), 12).issue(target.user.id);
    const response = await getApp().inject({
      method: 'PUT',
      url: `/users/${target.user.id}/password`,
      headers: authentication(manager.cookie),
      payload: { password: NEW_PASSWORD },
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    const stored = await new UserRepository(getApp().db).findById(target.user.id);
    expect(stored).not.toBeNull();
    await expect(verifyPassword(NEW_PASSWORD, stored?.passwordHash ?? '')).resolves.toBe(true);
    await expect(verifyPassword(PASSWORD, stored?.passwordHash ?? '')).resolves.toBe(false);

    const sessionRepository = new SessionRepository(getApp().db);
    await expect(sessionRepository.findActiveByTokenHash(hashSessionToken(target.accessToken))).resolves.toBeNull();
    await expect(
      sessionRepository.findActiveByTokenHash(hashSessionToken(secondSession.accessToken)),
    ).resolves.toBeNull();
  });

  it('отзывает все сессии при смене роли и деактивации пользователя', async () => {
    const manager = await createIdentity();
    const roleTarget = await createIdentity('foreman');
    const inactiveTarget = await createIdentity('foreman');
    const sessionService = new SessionService(new SessionRepository(getApp().db), 12);
    const roleTargetSecondSession = await sessionService.issue(roleTarget.user.id);
    const inactiveTargetSecondSession = await sessionService.issue(inactiveTarget.user.id);
    const headers = authentication(manager.cookie);

    const roleResponse = await getApp().inject({
      method: 'PATCH',
      url: `/users/${roleTarget.user.id}`,
      headers,
      payload: { role: 'manager' },
    });
    const inactiveResponse = await getApp().inject({
      method: 'PATCH',
      url: `/users/${inactiveTarget.user.id}`,
      headers,
      payload: { isActive: false },
    });

    expect(roleResponse.statusCode).toBe(200);
    expect(inactiveResponse.statusCode).toBe(200);

    const sessionRepository = new SessionRepository(getApp().db);
    for (const token of [
      roleTarget.accessToken,
      roleTargetSecondSession.accessToken,
      inactiveTarget.accessToken,
      inactiveTargetSecondSession.accessToken,
    ]) {
      await expect(sessionRepository.findActiveByTokenHash(hashSessionToken(token))).resolves.toBeNull();
    }
  });
});
