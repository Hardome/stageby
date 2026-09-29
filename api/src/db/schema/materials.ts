import { index, integer, pgTable, timestamp } from 'drizzle-orm/pg-core';

import { stages } from './stages.ts';

export const materialOrders = pgTable(
  'material_orders',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    stageId: integer()
      .notNull()
      .references(() => stages.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('material_orders_stage_idx').on(table.stageId)],
);

export const materialInvoices = pgTable(
  'material_invoices',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer()
      .notNull()
      .references(() => materialOrders.id, { onDelete: 'cascade' }),
    deliveredAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('material_invoices_order_idx').on(table.orderId)],
);

export type MaterialOrderRow = typeof materialOrders.$inferSelect;
export type MaterialInvoiceRow = typeof materialInvoices.$inferSelect;
