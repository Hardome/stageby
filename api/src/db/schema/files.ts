import { sql } from 'drizzle-orm';
import { check, index, integer, pgEnum, pgTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { checklistItems } from './checklists.ts';
import { projects } from './projects.ts';
import { users } from './users.ts';

export const fileStatusEnum = pgEnum('file_status', ['pending', 'uploaded', 'failed', 'deleted']);
export const filePurposeEnum = pgEnum('file_purpose', ['project_document', 'checklist_photo', 'material_invoice']);

export const files = pgTable(
  'files',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    status: fileStatusEnum().notNull().default('pending'),
    purpose: filePurposeEnum().notNull(),
    storageKey: varchar({ length: 500 }).notNull(),
    originalName: varchar({ length: 255 }).notNull(),
    mimeType: varchar({ length: 255 }).notNull(),
    sizeBytes: integer().notNull(),
    checksumSha256: varchar({ length: 64 }).notNull(),
    uploadedByUserId: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    uploadExpiresAt: timestamp({ withTimezone: true }).notNull(),
    uploadedAt: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),
    deletedAt: timestamp({ withTimezone: true }),
    completionIdempotencyKey: varchar({ length: 100 }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('files_storage_key_unique').on(table.storageKey),
    uniqueIndex('files_completion_idempotency_key_unique').on(table.completionIdempotencyKey),
    index('files_expiration_cleanup_idx')
      .on(table.expiresAt)
      .where(sql`${table.deletedAt} is null and ${table.expiresAt} is not null`),
    index('files_pending_cleanup_idx').on(table.uploadExpiresAt).where(sql`${table.status} = 'pending'`),
    check('files_storage_key_not_blank_check', sql`btrim(${table.storageKey}) <> ''`),
    check('files_original_name_not_blank_check', sql`btrim(${table.originalName}) <> ''`),
    check('files_mime_type_not_blank_check', sql`btrim(${table.mimeType}) <> ''`),
    check('files_size_bytes_check', sql`${table.sizeBytes} > 0`),
    check('files_checksum_sha256_check', sql`${table.checksumSha256} ~ '^[a-f0-9]{64}$'`),
    check(
      'files_lifecycle_check',
      sql`(${table.status} = 'pending' and ${table.uploadedAt} is null and ${table.deletedAt} is null) or (${table.status} = 'uploaded' and ${table.uploadedAt} is not null and ${table.deletedAt} is null) or (${table.status} = 'failed' and ${table.uploadedAt} is null) or (${table.status} = 'deleted' and ${table.deletedAt} is not null)`,
    ),
  ],
);

export const projectDocuments = pgTable(
  'project_documents',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    projectId: integer()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    fileId: integer()
      .notNull()
      .references(() => files.id, { onDelete: 'restrict' }),
    position: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('project_documents_project_position_unique').on(table.projectId, table.position),
    uniqueIndex('project_documents_file_unique').on(table.fileId),
    check('project_documents_position_check', sql`${table.position} > 0`),
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
    position: integer().notNull(),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('checklist_item_photos_file_unique').on(table.fileId),
    uniqueIndex('checklist_item_photos_active_position_unique')
      .on(table.checklistItemId, table.position)
      .where(sql`${table.deletedAt} is null`),
    index('checklist_item_photos_item_idx').on(table.checklistItemId),
    check('checklist_item_photos_position_check', sql`${table.position} between 1 and 20`),
  ],
);

export type FileRow = typeof files.$inferSelect;
export type ProjectDocumentRow = typeof projectDocuments.$inferSelect;
export type ChecklistItemPhotoRow = typeof checklistItemPhotos.$inferSelect;
