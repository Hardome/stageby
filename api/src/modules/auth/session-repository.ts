import { and, eq, gt, isNull, lte } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as databaseSchema from '#app/db/schema/index';
import { type SessionRow, sessions } from '#app/db/schema/sessions';

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

  async deleteExpired(expiredBefore = new Date()): Promise<number> {
    const deleted = await this.#database
      .delete(sessions)
      .where(lte(sessions.expiresAt, expiredBefore))
      .returning({ id: sessions.id });

    return deleted.length;
  }
}
