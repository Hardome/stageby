import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.ts';

export const sessions = pgTable(
  'sessions',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar({ length: 64 }).notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_unique').on(table.tokenHash),
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
    check('sessions_token_hash_format_check', sql`${table.tokenHash} ~ '^[0-9a-f]{64}$'`),
    check('sessions_expiry_check', sql`${table.expiresAt} > ${table.createdAt}`),
    check('sessions_revoked_at_check', sql`${table.revokedAt} is null or ${table.revokedAt} >= ${table.createdAt}`),
  ],
);

export type SessionRow = typeof sessions.$inferSelect;
