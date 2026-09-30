import { sql } from 'drizzle-orm';
import { bigint, check, index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { files } from './files.ts';
import { stages } from './stages.ts';
import { users } from './users.ts';

export const materialOrders = pgTable(
  'material_orders',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    stageId: integer()
      .notNull()
      .references(() => stages.id, { onDelete: 'cascade' }),
    sentAt: timestamp({ withTimezone: true }),
    sentByUserId: integer().references(() => users.id, { onDelete: 'restrict' }),
    version: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('material_orders_stage_idx').on(table.stageId),
    index('material_orders_sent_idx').on(table.sentAt),
    check(
      'material_orders_sent_author_check',
      sql`(${table.sentAt} is null and ${table.sentByUserId} is null) or (${table.sentAt} is not null and ${table.sentByUserId} is not null)`,
    ),
    check('material_orders_version_check', sql`${table.version} >= 1`),
  ],
);

export const materialInvoices = pgTable(
  'material_invoices',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer()
      .notNull()
      .references(() => materialOrders.id, { onDelete: 'cascade' }),
    fileId: integer()
      .notNull()
      .references(() => files.id, { onDelete: 'restrict' }),
    supplierName: varchar({ length: 255 }),
    amountMinor: bigint({ mode: 'number' }).notNull(),
    paidAt: timestamp({ withTimezone: true }),
    paidByUserId: integer().references(() => users.id, { onDelete: 'restrict' }),
    deliveredAt: timestamp({ withTimezone: true }),
    deliveredByUserId: integer().references(() => users.id, { onDelete: 'restrict' }),
    version: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('material_invoices_order_idx').on(table.orderId),
    index('material_invoices_order_paid_delivered_idx').on(table.orderId, table.paidAt, table.deliveredAt),
    uniqueIndex('material_invoices_file_unique').on(table.fileId),
    check(
      'material_invoices_supplier_not_blank_check',
      sql`${table.supplierName} is null or btrim(${table.supplierName}) <> ''`,
    ),
    check('material_invoices_amount_check', sql`${table.amountMinor} > 0 and ${table.amountMinor} % 100 = 0`),
    check(
      'material_invoices_paid_author_check',
      sql`(${table.paidAt} is null and ${table.paidByUserId} is null) or (${table.paidAt} is not null and ${table.paidByUserId} is not null)`,
    ),
    check(
      'material_invoices_delivered_author_check',
      sql`(${table.deliveredAt} is null and ${table.deliveredByUserId} is null) or (${table.deliveredAt} is not null and ${table.deliveredByUserId} is not null)`,
    ),
    check('material_invoices_version_check', sql`${table.version} >= 1`),
  ],
);

export const materialShortages = pgTable(
  'material_shortages',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    invoiceId: integer()
      .notNull()
      .references(() => materialInvoices.id, { onDelete: 'cascade' }),
    comment: text().notNull(),
    reportedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    reportedByUserId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    resolvedAt: timestamp({ withTimezone: true }),
    resolvedByUserId: integer().references(() => users.id, { onDelete: 'restrict' }),
    resolutionComment: text(),
    version: integer().notNull().default(1),
  },
  (table) => [
    index('material_shortages_invoice_idx').on(table.invoiceId),
    index('material_shortages_open_idx').on(table.invoiceId).where(sql`${table.resolvedAt} is null`),
    check(
      'material_shortages_comment_check',
      sql`btrim(${table.comment}) <> '' and char_length(${table.comment}) <= 500`,
    ),
    check(
      'material_shortages_resolution_comment_check',
      sql`${table.resolutionComment} is null or (btrim(${table.resolutionComment}) <> '' and char_length(${table.resolutionComment}) <= 500)`,
    ),
    check(
      'material_shortages_resolution_author_check',
      sql`(${table.resolvedAt} is null and ${table.resolvedByUserId} is null and ${table.resolutionComment} is null) or (${table.resolvedAt} is not null and ${table.resolvedByUserId} is not null)`,
    ),
    check('material_shortages_version_check', sql`${table.version} >= 1`),
  ],
);

export type MaterialOrderRow = typeof materialOrders.$inferSelect;
export type MaterialInvoiceRow = typeof materialInvoices.$inferSelect;
export type MaterialShortageRow = typeof materialShortages.$inferSelect;
