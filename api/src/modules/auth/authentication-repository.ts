import { and, eq, gt, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type * as databaseSchema from '#app/db/schema/index';
import { sessions } from '#app/db/schema/sessions';
import { users } from '#app/db/schema/users';
import type { AuthenticationContext } from '#app/modules/auth/authentication-context';

export class AuthenticationRepository {
  readonly #database: NodePgDatabase<typeof databaseSchema>;

  constructor(database: NodePgDatabase<typeof databaseSchema>) {
    this.#database = database;
  }

  async findByActiveTokenHash(tokenHash: string, now = new Date()): Promise<AuthenticationContext | null> {
    const [context] = await this.#database
      .select({
        user: {
          id: users.id,
          login: users.login,
          fullName: users.fullName,
          role: users.role,
          phone: users.phone,
          isActive: users.isActive,
          passwordResetRequestedAt: users.passwordResetRequestedAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
        session: {
          id: sessions.id,
          userId: sessions.userId,
          expiresAt: sessions.expiresAt,
          createdAt: sessions.createdAt,
        },
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now),
          eq(users.isActive, true),
        ),
      )
      .limit(1);

    return context ?? null;
  }
}
