import { argon2, randomBytes, randomUUID } from 'node:crypto';

import { eq, inArray } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sessions } from '#app/db/schema/sessions';
import { users } from '#app/db/schema/users';
import { LoginService } from '#app/modules/auth/login-service';
import { hashPassword, passwordNeedsRehash, verifyPassword } from '#app/modules/auth/password-hasher';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { UserRepository } from '#app/modules/users/repository';
import { setupModuleTest } from '#test/setup-module-test';

const getApp = setupModuleTest(async () => {});
const createdIds: number[] = [];
const password = 'Existing-password-123!';

afterEach(async () => {
  if (createdIds.length > 0) await getApp().db.delete(users).where(inArray(users.id, createdIds));
  createdIds.length = 0;
});

async function weakerPasswordHash() {
  const salt = randomBytes(16);
  const hash = await new Promise<Buffer>((resolve, reject) => {
    argon2(
      'argon2id',
      { message: password, nonce: salt, memory: 8192, passes: 1, parallelism: 1, tagLength: 32 },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
  });
  return `$argon2id$v=19$m=8192,t=1,p=1$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

async function setup(passwordHash?: string) {
  const repository = new UserRepository(getApp().db);
  const user = await repository.create({
    login: `race.${randomUUID().replaceAll('-', '')}`,
    passwordHash: passwordHash ?? (await hashPassword(password)),
    fullName: 'Проверка конкурентного входа',
    role: 'foreman',
  });
  createdIds.push(user.id);
  const sessionService = new SessionService(new SessionRepository(getApp().db), 12);
  return { repository, user, sessionService, login: new LoginService(repository, sessionService) };
}

describe('Выдача сессии при конкурентных изменениях', () => {
  it('дожидается фиксации конкурентной транзакции и проверяет актуальный пароль', async () => {
    const { user, sessionService } = await setup();
    const newHash = await hashPassword('New-password-123!');
    let pending: ReturnType<SessionService['issueForVerifiedUser']> | undefined;
    await getApp().db.transaction(async (transaction) => {
      await transaction.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
      pending = sessionService.issueForVerifiedUser(user);
    });
    expect(await pending).toBeNull();
    expect(await getApp().db.select().from(sessions).where(eq(sessions.userId, user.id))).toHaveLength(0);
  });

  it.each(['password', 'role', 'deactivate'] as const)('отклоняет вход после изменения %s', async (change) => {
    const { repository, user, login } = await setup();
    const read = Promise.withResolvers<void>();
    const resume = Promise.withResolvers<void>();
    const find = repository.findByLogin.bind(repository);
    vi.spyOn(repository, 'findByLogin').mockImplementation(async (value) => {
      const snapshot = await find(value);
      read.resolve();
      await resume.promise;
      return snapshot;
    });
    const pending = login.login(user.login, password);
    await read.promise;
    try {
      if (change === 'password')
        await repository.setPasswordAtomically(user.id, await hashPassword('New-password-123!'));
      else await repository.updateAtomically(user.id, change === 'role' ? { role: 'manager' } : { isActive: false });
    } finally {
      resume.resolve();
    }
    expect(await pending).toBeNull();
    expect(await getApp().db.select().from(sessions).where(eq(sessions.userId, user.id))).toHaveLength(0);
  });

  it('отзывает выданную перед сменой пароля сессию', async () => {
    const { repository, user, login } = await setup();
    const result = await login.login(user.login, password);
    expect(result).not.toBeNull();
    await repository.setPasswordAtomically(user.id, await hashPassword('New-password-123!'));
    const stored = await new SessionRepository(getApp().db).findActiveByTokenHash(
      result!.issuedSession.session.tokenHash,
    );
    expect(stored).toBeNull();
  });

  it('обновляет старый хеш только при успешном входе и сохраняет существующие сессии', async () => {
    const oldHash = await weakerPasswordHash();
    const { repository, user, sessionService, login } = await setup(oldHash);
    const existing = await sessionService.issue(user.id);
    expect(await login.login(user.login, 'wrong-password')).toBeNull();
    expect((await repository.findById(user.id))?.passwordHash).toBe(oldHash);
    expect(await login.login(user.login, password)).not.toBeNull();
    const updated = await repository.findById(user.id);
    expect(passwordNeedsRehash(updated!.passwordHash)).toBe(false);
    expect(await verifyPassword(password, updated!.passwordHash)).toBe(true);
    expect(await new SessionRepository(getApp().db).findActiveByTokenHash(existing.session.tokenHash)).not.toBeNull();
    const currentHash = updated!.passwordHash;
    expect(await login.login(user.login, password)).not.toBeNull();
    expect((await repository.findById(user.id))?.passwordHash).toBe(currentHash);
  });

  it('не перезаписывает новый пароль при конкурентном обновлении старого хеша', async () => {
    const { repository, user, sessionService, login } = await setup(await weakerPasswordHash());
    const ready = Promise.withResolvers<void>();
    const resume = Promise.withResolvers<void>();
    const issue = sessionService.issueForVerifiedUser.bind(sessionService);
    vi.spyOn(sessionService, 'issueForVerifiedUser').mockImplementation(async (...args) => {
      ready.resolve();
      await resume.promise;
      return issue(...args);
    });
    const pending = login.login(user.login, password);
    await ready.promise;
    const newHash = await hashPassword('New-password-123!');
    try {
      await repository.setPasswordAtomically(user.id, newHash);
    } finally {
      resume.resolve();
    }
    expect(await pending).toBeNull();
    expect((await repository.findById(user.id))?.passwordHash).toBe(newHash);
  });
});
