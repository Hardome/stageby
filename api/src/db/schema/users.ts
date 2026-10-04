import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgEnum, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['manager', 'estimator', 'foreman', 'inspector']);

export const users = pgTable(
  'users',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    login: varchar({ length: 64 }).notNull(),
    passwordHash: varchar({ length: 512 }).notNull(),
    fullName: varchar({ length: 255 }).notNull(),
    role: userRoleEnum().notNull(),
    phone: varchar({ length: 32 }),
    isActive: boolean().notNull().default(true),
    passwordResetRequestedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_login_unique').on(table.login),
    index('users_role_active_idx').on(table.role, table.isActive),
    check('users_login_format_check', sql`${table.login} ~ '^[a-z0-9][a-z0-9._-]{2,63}$'`),
    check('users_password_hash_not_blank_check', sql`btrim(${table.passwordHash}) <> ''`),
    check('users_full_name_not_blank_check', sql`btrim(${table.fullName}) <> ''`),
    check('users_phone_not_blank_check', sql`${table.phone} is null or btrim(${table.phone}) <> ''`),
  ],
);

export type UserRow = typeof users.$inferSelect;
