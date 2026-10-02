import { and, asc, eq, gt, inArray, isNull, lte } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as databaseSchema from '#app/db/schema/index';
import { type SessionRow, sessions } from '#app/db/schema/sessions';
import { type UserRow, users } from '#app/db/schema/users';

export interface CreateSessionRecord {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  createdAt?: Date;
}

export class SessionRepository {
  readonly #database: NodePgDatabase<typeof databaseSchema>;

  constructor(database: NodePgDatabase<typeof databaseSchema>) {
    this.#database = database;
  }

  async create(input: CreateSessionRecord): Promise<SessionRow> {
    const [session] = await this.#database.insert(sessions).values(input).returning();

    if (!session) {
      throw new Error('Не удалось создать сессию');
    }

    return session;
  }

  async createForVerifiedUser(input: CreateSessionRecord, verifiedUser: UserRow, replacementHash?: string) {
    return this.#database.transaction(async (transaction) => {
      const [current] = await transaction.select().from(users).where(eq(users.id, verifiedUser.id)).for('update');
      if (
        !current ||
        !current.isActive ||
        current.passwordHash !== verifiedUser.passwordHash ||
        current.role !== verifiedUser.role ||
        current.updatedAt.getTime() !== verifiedUser.updatedAt.getTime()
      )
        return null;

      let user = current;
      if (replacementHash) {
        const [updated] = await transaction
          .update(users)
          .set({ passwordHash: replacementHash })
          .where(eq(users.id, current.id))
          .returning();
        if (!updated) throw new Error('Не удалось обновить хеш пароля');
        user = updated;
      }
      const [session] = await transaction.insert(sessions).values(input).returning();
      if (!user || !session) throw new Error('Не удалось создать сессию');
      return { user, session };
    });
  }

  async findActiveByTokenHash(tokenHash: string, now = new Date()): Promise<SessionRow | null> {
    const [session] = await this.#database
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)))
      .limit(1);

    return session ?? null;
  }

  async revokeByTokenHash(tokenHash: string, revokedAt = new Date()): Promise<boolean> {
    const revoked = await this.#database
      .update(sessions)
      .set({ revokedAt })
      .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });

    return revoked.length > 0;
  }

  async revokeById(id: number, revokedAt = new Date()): Promise<boolean> {
    const revoked = await this.#database
      .update(sessions)
      .set({ revokedAt })
      .where(and(eq(sessions.id, id), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });

    return revoked.length > 0;
  }

  async revokeAllForUser(userId: number, revokedAt = new Date()): Promise<number> {
    const revoked = await this.#database
      .update(sessions)
      .set({ revokedAt })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });

    return revoked.length;
  }

  async deleteExpired(expiredBefore = new Date(), batchSize = 1000): Promise<number> {
    return this.#database.transaction(async (transaction) => {
      const expired = await transaction
        .select({ id: sessions.id })
        .from(sessions)
        .where(lte(sessions.expiresAt, expiredBefore))
        .orderBy(asc(sessions.id))
        .limit(batchSize)
        .for('update', { skipLocked: true });
      if (expired.length === 0) return 0;
      const deleted = await transaction
        .delete(sessions)
        .where(
          inArray(
            sessions.id,
            expired.map(({ id }) => id),
          ),
        )
        .returning({ id: sessions.id });
      return deleted.length;
    });
  }
}
