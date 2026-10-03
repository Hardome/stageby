import { randomUUID } from 'node:crypto';

import fastifyCookie from '@fastify/cookie';
import { eq, inArray } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import { auditChanges, auditEvents } from '#app/db/schema/audit';
import { users } from '#app/db/schema/users';
import type { AuditContext } from '#app/modules/audit/context';
import { AuditWriter, append, auditedTransaction } from '#app/modules/audit/repository';
import { snapshot } from '#app/modules/audit/snapshots';
import { SessionRepository } from '#app/modules/auth/session-repository';
import { SessionService } from '#app/modules/auth/session-service';
import { userModule } from '#app/modules/users/index';
import { UserRepository } from '#app/modules/users/repository';
import { registerAuthentication } from '#app/plugins/authentication';
import { setupModuleTest } from '#test/setup-module-test';

const getApp = setupModuleTest(async (app) => {
  await app.register(fastifyCookie);
  await registerAuthentication(app);
  await app.register(userModule);
});
const userIds: number[] = [];

afterEach(async () => {
  if (userIds.length > 0) await getApp().db.delete(users).where(inArray(users.id, userIds));
  userIds.length = 0;
});

function context(): AuditContext {
  return { source: 'system', requestId: randomUUID() };
}

async function events(requestId: string) {
  return getApp().db.select().from(auditEvents).where(eq(auditEvents.requestId, requestId));
}

async function identity() {
  const [user] = await getApp()
    .db.insert(users)
    .values({
      login: `audit.${randomUUID().replaceAll('-', '')}`,
      fullName: 'Audit manager',
      role: 'manager',
      passwordHash: 'secret-hash',
    })
    .returning();
  userIds.push(user!.id);
  return user!;
}

describe('Audit storage', () => {
  it('records authenticated HTTP creation, update and password changes without secrets', async () => {
    const actor = await identity();
    const session = await new SessionService(new SessionRepository(getApp().db), 12).issue(actor.id);
    const headers = { cookie: `stageby_session=${session.accessToken}` };
    const response = await getApp().inject({
      method: 'POST',
      url: '/users',
      headers,
      payload: {
        login: `audit.${randomUUID().replaceAll('-', '')}`,
        fullName: 'New user',
        role: 'foreman',
        password: 'Audit-password-123!',
      },
    });
    expect(response.statusCode, response.body).toBe(201);
    const id = response.json<{ id: number }>().id;
    userIds.push(id);
    const patch = await getApp().inject({
      method: 'PATCH',
      url: `/users/${id}`,
      headers,
      payload: { fullName: 'Changed user' },
    });
    expect(patch.statusCode).toBe(200);
    const password = await getApp().inject({
      method: 'PUT',
      url: `/users/${id}/password`,
      headers,
      payload: { password: 'Another-password-123!' },
    });
    expect(password.statusCode).toBe(204);
    const recorded = await getApp()
      .db.select()
      .from(auditEvents)
      .where(eq(auditEvents.actorUserId, actor.id))
      .orderBy(auditEvents.id);
    expect(recorded.map((event) => event.operation)).toEqual(['createUser', 'updateUser', 'setUserPassword']);
    for (const event of recorded)
      expect(event).toMatchObject({
        source: 'api',
        formatVersion: 1,
        requestId: expect.any(String),
        actorSnapshot: { fullName: actor.fullName, login: actor.login, role: actor.role },
      });
    const changes = await getApp()
      .db.select()
      .from(auditChanges)
      .where(
        inArray(
          auditChanges.eventId,
          recorded.map((event) => event.id),
        ),
      )
      .orderBy(auditChanges.id);
    expect(changes).toHaveLength(2);
    expect(changes[0]).toMatchObject({
      entityType: 'users',
      entityKey: { id },
      action: 'create',
      before: null,
      after: { fullName: 'New user', createdAt: expect.any(String) },
    });
    expect(changes[1]).toMatchObject({
      action: 'update',
      before: { fullName: 'New user' },
      after: { fullName: 'Changed user' },
    });
    expect(JSON.stringify(changes)).not.toMatch(/password|secret-hash|stageby_session/);
  });

  it('does not record failed or unchanged user operations', async () => {
    const user = await identity();
    const auditContext = context();
    const repository = new UserRepository(getApp().db);
    await repository.updateAtomically(user.id, { fullName: user.fullName }, auditContext);
    await repository.updateAtomically(2_147_483_647, { fullName: 'Missing' }, auditContext);
    await repository.setPasswordAtomically(2_147_483_647, 'another-hash', auditContext);
    await expect(
      repository.create(
        { login: user.login, fullName: 'Duplicate', role: 'foreman', passwordHash: 'secret' },
        auditContext,
      ),
    ).rejects.toThrow();
    expect(await events(auditContext.requestId!)).toEqual([]);
  });

  it('rolls back data on audit failure and leaves no event on operation rollback', async () => {
    const user = await identity();
    const auditContext = context();
    await expect(
      auditedTransaction(getApp().db, auditContext, 'updateUser', async (transaction, audit) => {
        await audit.mutate(users, eq(users.id, user.id), () =>
          transaction.update(users).set({ fullName: 'Rolled back' }).where(eq(users.id, user.id)),
        );
        throw new Error('Operation failed');
      }),
    ).rejects.toThrow('Operation failed');
    await expect(
      getApp().db.transaction(async (transaction) => {
        const audit = new AuditWriter(transaction);
        await audit.mutate(users, eq(users.id, user.id), () =>
          transaction.update(users).set({ fullName: 'Rolled back' }).where(eq(users.id, user.id)),
        );
        await append(
          transaction,
          auditContext,
          'updateUser',
          audit.changes.map((change) => ({ ...change, action: 'delete' })),
        );
      }),
    ).rejects.toThrow();
    const [retained] = await getApp().db.select().from(users).where(eq(users.id, user.id));
    expect(retained?.fullName).toBe(user.fullName);
    expect(await events(auditContext.requestId!)).toEqual([]);
  });

  it('captures locked snapshots for concurrent changes and preserves history after deletion', async () => {
    const user = await identity();
    const auditContext = context();
    const repository = new UserRepository(getApp().db);
    await Promise.all(
      ['First', 'Second'].map((fullName) => repository.updateAtomically(user.id, { fullName }, auditContext)),
    );
    const recorded = await events(auditContext.requestId!);
    const changes = await getApp()
      .db.select()
      .from(auditChanges)
      .where(
        inArray(
          auditChanges.eventId,
          recorded.map((event) => event.id),
        ),
      )
      .orderBy(auditChanges.id);
    expect(changes).toHaveLength(2);
    expect(changes[0]?.before?.fullName).toBe(user.fullName);
    expect(changes[1]?.before).toEqual(changes[0]?.after);
    await auditedTransaction(getApp().db, auditContext, 'deleteTestUser', async (transaction, audit) => {
      await audit.mutate(users, eq(users.id, user.id), () => transaction.delete(users).where(eq(users.id, user.id)));
    });
    const deletedEvents = await events(auditContext.requestId!);
    const [deletedChange] = await getApp()
      .db.select()
      .from(auditChanges)
      .where(eq(auditChanges.eventId, deletedEvents.at(-1)!.id));
    expect(deletedChange).toMatchObject({
      action: 'delete',
      entityKey: { id: user.id },
      before: changes[1]?.after,
      after: null,
    });
  });

  it('serializes dates and bigint and excludes unapproved fields', () => {
    const date = new Date('2026-10-03T12:00:00Z');
    expect(snapshot('work_payments', { id: 1, amountMinor: 12300n, createdAt: date, token: 'secret' })).toEqual({
      id: 1,
      amountMinor: '12300',
      createdAt: date.toISOString(),
    });
    expect(
      snapshot('files', { id: 1, storageKey: 'secret', completionIdempotencyKey: 'secret', signedUrl: 'secret' }),
    ).toEqual({ id: 1 });
  });
});
