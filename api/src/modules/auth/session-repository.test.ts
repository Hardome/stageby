import { randomUUID } from 'node:crypto';

import { inArray } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import { users } from '#app/db/schema/users';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { hashSessionToken } from '#app/modules/auth/session-token';
import { UserRepository } from '#app/modules/users/repository';
import { setupModuleTest } from '#test/setup-module-test';

const getApp = setupModuleTest(async () => {});
const createdUserIds: number[] = [];

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await getApp().db.delete(users).where(inArray(users.id, createdUserIds));
    createdUserIds.length = 0;
  }
});

async function createTestUser(repository: UserRepository) {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 20);
  const user = await repository.create({
    login: `test.${suffix}`,
    passwordHash: 'integration-test-password-hash',
    fullName: 'Интеграционный пользователь',
    role: 'manager',
  });
  createdUserIds.push(user.id);
  return user;
}

describe('Хранилище пользователей и сессий', () => {
  it('создаёт и находит пользователя', async () => {
    const repository = new UserRepository(getApp().db);
    const created = await createTestUser(repository);

    await expect(repository.findById(created.id)).resolves.toEqual(created);
    await expect(repository.findByLogin(created.login)).resolves.toEqual(created);
    await expect(repository.findByLogin(`missing.${randomUUID()}`)).resolves.toBeNull();
  });

  it('выпускает, находит и отзывает одну сессию без хранения исходного токена', async () => {
    const app = getApp();
    const user = await createTestUser(new UserRepository(app.db));
    const repository = new SessionRepository(app.db);
    const service = new SessionService(repository, 12);
    const issuedAt = new Date();
    const issued = await service.issue(user.id, issuedAt);
    const tokenHash = hashSessionToken(issued.accessToken);

    expect(issued.expiresAt.getTime()).toBe(issuedAt.getTime() + 12 * 60 * 60 * 1000);
    expect(issued.session.createdAt).toEqual(issuedAt);
    expect(issued.session.tokenHash).toBe(tokenHash);
    expect(issued.session.tokenHash).not.toBe(issued.accessToken);
    await expect(repository.findActiveByTokenHash(tokenHash, issuedAt)).resolves.toEqual(issued.session);

    await expect(service.revoke(issued.accessToken)).resolves.toBe(true);
    await expect(repository.findActiveByTokenHash(tokenHash)).resolves.toBeNull();
    await expect(service.revoke(issued.accessToken)).resolves.toBe(false);
  });

  it('отзывает все сессии пользователя и удаляет истёкшие', async () => {
    const app = getApp();
    const user = await createTestUser(new UserRepository(app.db));
    const repository = new SessionRepository(app.db);
    const service = new SessionService(repository, 1);
    const first = await service.issue(user.id);
    const second = await service.issue(user.id);

    await expect(repository.revokeAllForUser(user.id)).resolves.toBe(2);
    await expect(repository.findActiveByTokenHash(hashSessionToken(first.accessToken))).resolves.toBeNull();
    await expect(repository.findActiveByTokenHash(hashSessionToken(second.accessToken))).resolves.toBeNull();

    const deleted = await repository.deleteExpired(new Date(Date.now() + 2 * 60 * 60 * 1000));
    expect(deleted).toBe(2);
  });

  it('не принимает срок сессии вне диапазона контракта', () => {
    const repository = new SessionRepository(getApp().db);

    expect(() => new SessionService(repository, 0)).toThrow(RangeError);
    expect(() => new SessionService(repository, 13)).toThrow(RangeError);
    expect(() => new SessionService(repository, 1.5)).toThrow(RangeError);
  });

  it('удаляет истёкшие сессии порциями и сохраняет действующие', async () => {
    const app = getApp();
    const user = await createTestUser(new UserRepository(app.db));
    const repository = new SessionRepository(app.db);
    const service = new SessionService(repository, 1);
    const now = new Date();
    await service.issue(user.id, new Date(now.getTime() - 2 * 60 * 60 * 1000));
    await service.issue(user.id, new Date(now.getTime() - 2 * 60 * 60 * 1000));
    const active = await service.issue(user.id, now);
    expect(await repository.deleteExpired(now, 1)).toBe(1);
    expect(await repository.deleteExpired(now, 1)).toBe(1);
    expect(await repository.deleteExpired(now, 1)).toBe(0);
    expect(await repository.findActiveByTokenHash(active.session.tokenHash, now)).not.toBeNull();
  });
});
