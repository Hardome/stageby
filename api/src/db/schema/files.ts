import { sql } from 'drizzle-orm';
import { check, integer, pgEnum, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { checklistItems } from './checklists.ts';

export const fileStatusEnum = pgEnum('file_status', ['pending', 'uploaded', 'failed', 'deleted']);

export const files = pgTable(
  'files',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    status: fileStatusEnum().notNull().default('pending'),
    mimeType: varchar({ length: 255 }).notNull(),
    sizeBytes: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('files_mime_type_not_blank_check', sql`btrim(${table.mimeType}) <> ''`),
    check('files_size_bytes_check', sql`${table.sizeBytes} > 0`),
  ],
);

export const checklistItemPhotos = pgTable(
  'checklist_item_photos',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    checklistItemId: integer()
      .notNull()
      .references(() => checklistItems.id, { onDelete: 'cascade' }),
    fileId: integer()
      .notNull()
      .references(() => files.id, { onDelete: 'restrict' }),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('checklist_item_photos_file_unique').on(table.fileId)],
);

export type FileRow = typeof files.$inferSelect;
export type ChecklistItemPhotoRow = typeof checklistItemPhotos.$inferSelect;
