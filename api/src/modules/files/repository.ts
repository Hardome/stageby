import { randomUUID } from 'node:crypto';

import { and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm';

import { checklistItems, checklists } from '#app/db/schema/checklists';
import { checklistItemPhotos, type FileRow, files } from '#app/db/schema/files';
import { projects } from '#app/db/schema/projects';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import type { ChecklistItemPhoto, CreateFileUpload, File, FileDownload, FileUpload } from '#app/generated/types.gen';
import { toChecklistItemPhoto, toFile } from '#app/modules/files/mapper';
import { getMaximumSize, isAllowedMimeType, validateUploadPolicy } from '#app/modules/files/policy';
import type { Actor, Database, FileOperationError, FileOperationResult } from '#app/modules/files/types';
import type { FileStorage, StoredObjectMetadata } from '#app/storage/file-storage';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

function checksumToBase64(checksum: string): string {
  return Buffer.from(checksum, 'hex').toString('base64');
}

function canReadStage(actor: Actor, assigneeId: number | null): boolean {
  return actor.role === 'manager' || assigneeId === actor.id;
}

function nextPhotoPosition(positions: number[]): number | null {
  const occupied = new Set(positions);
  for (let position = 1; position <= 20; position += 1) {
    if (!occupied.has(position)) return position;
  }
  return null;
}

async function loadPhoto(database: Database | Transaction, photoId: number): Promise<ChecklistItemPhoto | null> {
  const [photo] = await database
    .select({
      id: checklistItemPhotos.id,
      checklistItemId: checklistItemPhotos.checklistItemId,
      fileId: checklistItemPhotos.fileId,
      position: checklistItemPhotos.position,
      uploadedByUserId: users.id,
      uploadedByName: users.fullName,
      uploadedAt: files.uploadedAt,
    })
    .from(checklistItemPhotos)
    .innerJoin(files, eq(checklistItemPhotos.fileId, files.id))
    .innerJoin(users, eq(files.uploadedByUserId, users.id))
    .where(
      and(eq(checklistItemPhotos.id, photoId), isNull(checklistItemPhotos.deletedAt), eq(files.status, 'uploaded')),
    );
  return photo?.uploadedAt ? toChecklistItemPhoto({ ...photo, uploadedAt: photo.uploadedAt }) : null;
}

async function loadItemContext(database: Database | Transaction, itemId: number) {
  const [context] = await database
    .select({ item: checklistItems, checklist: checklists, stage: stages, projectIsArchived: projects.isArchived })
    .from(checklistItems)
    .innerJoin(checklists, eq(checklistItems.checklistId, checklists.id))
    .innerJoin(stages, eq(checklists.stageId, stages.id))
    .innerJoin(projects, eq(stages.projectId, projects.id))
    .where(eq(checklistItems.id, itemId));
  return context;
}

function getCompletionPrecondition(
  file: FileRow | undefined,
  actor: Actor,
  checksumSha256: string,
  idempotencyKey: string,
  keyOwnerId: number | undefined,
): FileOperationResult<File> | null {
  if (!file || file.uploadedByUserId !== actor.id) return { status: 'not_found' };
  if (keyOwnerId !== undefined && keyOwnerId !== file.id) return { status: 'idempotency_conflict' };
  if (file.status === 'uploaded') {
    return file.completionIdempotencyKey === idempotencyKey && file.checksumSha256 === checksumSha256
      ? { status: 'ok', value: toFile(file) }
      : { status: 'idempotency_conflict' };
  }
  if (file.status !== 'pending') return { status: 'invalid_state' };
  if (file.uploadExpiresAt <= new Date()) return { status: 'upload_expired' };
  if (file.checksumSha256 !== checksumSha256) return { status: 'checksum_mismatch' };
  return null;
}

function getMetadataError(
  file: FileRow,
  metadata: StoredObjectMetadata | null,
  checksumSha256: string,
): FileOperationError | null {
  if (!metadata) return 'upload_incomplete';
  if (!isAllowedMimeType(file.purpose, metadata.mimeType) || metadata.mimeType !== file.mimeType) {
    return 'unsupported_mime_type';
  }
  if (metadata.sizeBytes > getMaximumSize(file.purpose)) return 'file_too_large';
  if (metadata.sizeBytes !== file.sizeBytes) return 'upload_incomplete';
  if (metadata.checksumSha256Base64 !== checksumToBase64(checksumSha256)) return 'checksum_mismatch';
  return null;
}

async function clearCompletedItemAfterLastPhoto(
  transaction: Transaction,
  context: NonNullable<Awaited<ReturnType<typeof loadItemContext>>>,
  removedPhotoId: number,
  now: Date,
): Promise<void> {
  if (!context.item.isCompleted) return;
  const [remaining] = await transaction
    .select({ id: checklistItemPhotos.id })
    .from(checklistItemPhotos)
    .where(
      and(
        eq(checklistItemPhotos.checklistItemId, context.item.id),
        isNull(checklistItemPhotos.deletedAt),
        sql`${checklistItemPhotos.id} <> ${removedPhotoId}`,
      ),
    )
    .limit(1);
  if (remaining) return;
  await transaction
    .update(checklistItems)
    .set({ isCompleted: false, completedAt: null, completedByUserId: null })
    .where(eq(checklistItems.id, context.item.id));
  await transaction
    .update(checklists)
    .set({ version: sql`${checklists.version} + 1`, updatedAt: now })
    .where(eq(checklists.id, context.checklist.id));
  if (context.stage.status === 'acceptance') {
    await transaction
      .update(stages)
      .set({ status: 'in_progress', version: sql`${stages.version} + 1`, updatedAt: now })
      .where(eq(stages.id, context.stage.id));
  }
}

export class FileRepository {
  readonly #database: Database;
  readonly #storage: FileStorage;
  readonly #signedUrlTtlSeconds: number;

  constructor(database: Database, storage: FileStorage, signedUrlTtlSeconds: number) {
    this.#database = database;
    this.#storage = storage;
    this.#signedUrlTtlSeconds = signedUrlTtlSeconds;
  }

  async createUpload(input: CreateFileUpload, actor: Actor): Promise<FileOperationResult<FileUpload>> {
    const policyError = validateUploadPolicy(input, actor);
    if (policyError) return { status: policyError };
    const storageKey = `uploads/${new Date().toISOString().slice(0, 10)}/${randomUUID()}`;
    const request = await this.#storage.createUploadRequest({
      key: storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksumSha256Base64: checksumToBase64(input.checksumSha256),
      expiresInSeconds: this.#signedUrlTtlSeconds,
    });
    const [file] = await this.#database
      .insert(files)
      .values({
        purpose: input.purpose,
        storageKey,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        checksumSha256: input.checksumSha256,
        uploadedByUserId: actor.id,
        uploadExpiresAt: request.expiresAt,
      })
      .returning({ id: files.id, status: files.status });
    if (!file) throw new Error('Не удалось создать upload-сессию');
    return {
      status: 'ok',
      value: {
        fileId: file.id,
        status: file.status,
        method: 'PUT',
        uploadUrl: request.url,
        headers: request.headers,
        expiresAt: request.expiresAt.toISOString(),
      },
    };
  }

  completeUpload(
    uploadId: number,
    checksumSha256: string,
    idempotencyKey: string,
    actor: Actor,
  ): Promise<FileOperationResult<File>> {
    return this.#database.transaction(async (transaction) => {
      const [file] = await transaction.select().from(files).where(eq(files.id, uploadId)).for('update');
      if (!file || file.uploadedByUserId !== actor.id) return { status: 'not_found' };
      const [keyOwner] = await transaction
        .select({ id: files.id })
        .from(files)
        .where(eq(files.completionIdempotencyKey, idempotencyKey));
      const precondition = getCompletionPrecondition(file, actor, checksumSha256, idempotencyKey, keyOwner?.id);
      if (precondition) return precondition;
      if (!file) return { status: 'not_found' };

      const metadata = await this.#storage.getMetadata(file.storageKey);
      const metadataError = getMetadataError(file, metadata, checksumSha256);
      if (metadataError) return { status: metadataError };

      const uploadedAt = new Date();
      const expiresAt =
        file.purpose === 'checklist_photo' ? new Date(uploadedAt.getTime() + 365 * 24 * 60 * 60 * 1000) : null;
      const [uploaded] = await transaction
        .update(files)
        .set({ status: 'uploaded', uploadedAt, expiresAt, completionIdempotencyKey: idempotencyKey })
        .where(eq(files.id, file.id))
        .returning();
      if (!uploaded) throw new Error('Не удалось завершить upload-сессию');
      return { status: 'ok', value: toFile(uploaded) };
    });
  }

  async getDownload(fileId: number, actor: Actor): Promise<FileOperationResult<FileDownload>> {
    const [row] = await this.#database
      .select({
        file: files,
        photoId: checklistItemPhotos.id,
        photoAssigneeId: stages.assigneeId,
      })
      .from(files)
      .leftJoin(
        checklistItemPhotos,
        and(eq(checklistItemPhotos.fileId, files.id), isNull(checklistItemPhotos.deletedAt)),
      )
      .leftJoin(checklistItems, eq(checklistItemPhotos.checklistItemId, checklistItems.id))
      .leftJoin(checklists, eq(checklistItems.checklistId, checklists.id))
      .leftJoin(stages, eq(checklists.stageId, stages.id))
      .where(and(eq(files.id, fileId), eq(files.status, 'uploaded')));
    if (!row) return { status: 'not_found' };
    const canRead =
      actor.role === 'manager' ||
      (row.file.purpose === 'checklist_photo' &&
        (row.photoAssigneeId === actor.id || (row.photoId === null && row.file.uploadedByUserId === actor.id)));
    if (!canRead) return { status: 'not_found' };
    const request = await this.#storage.createDownloadRequest({
      key: row.file.storageKey,
      originalName: row.file.originalName,
      expiresInSeconds: this.#signedUrlTtlSeconds,
    });
    return { status: 'ok', value: { downloadUrl: request.url, expiresAt: request.expiresAt.toISOString() } };
  }

  async listPhotos(itemId: number, actor: Actor): Promise<FileOperationResult<ChecklistItemPhoto[]>> {
    const context = await loadItemContext(this.#database, itemId);
    if (!context || !canReadStage(actor, context.stage.assigneeId)) return { status: 'not_found' };
    const rows = await this.#database
      .select({
        id: checklistItemPhotos.id,
        checklistItemId: checklistItemPhotos.checklistItemId,
        fileId: checklistItemPhotos.fileId,
        position: checklistItemPhotos.position,
        uploadedByUserId: users.id,
        uploadedByName: users.fullName,
        uploadedAt: files.uploadedAt,
      })
      .from(checklistItemPhotos)
      .innerJoin(files, eq(checklistItemPhotos.fileId, files.id))
      .innerJoin(users, eq(files.uploadedByUserId, users.id))
      .where(
        and(
          eq(checklistItemPhotos.checklistItemId, itemId),
          isNull(checklistItemPhotos.deletedAt),
          eq(files.status, 'uploaded'),
        ),
      )
      .orderBy(asc(checklistItemPhotos.position));
    return {
      status: 'ok',
      value: rows.flatMap((row) =>
        row.uploadedAt ? [toChecklistItemPhoto({ ...row, uploadedAt: row.uploadedAt })] : [],
      ),
    };
  }

  attachPhoto(itemId: number, fileId: number, actor: Actor): Promise<FileOperationResult<ChecklistItemPhoto>> {
    return this.#database.transaction(async (transaction) => {
      await transaction.execute(sql`select pg_advisory_xact_lock(${itemId})`);
      const context = await loadItemContext(transaction, itemId);
      if (!context || !canReadStage(actor, context.stage.assigneeId)) return { status: 'not_found' };
      if (context.projectIsArchived) return { status: 'project_archived' };
      const [file] = await transaction.select().from(files).where(eq(files.id, fileId)).for('update');
      if (
        !file ||
        file.status !== 'uploaded' ||
        file.purpose !== 'checklist_photo' ||
        (actor.role !== 'manager' && file.uploadedByUserId !== actor.id)
      ) {
        return { status: 'not_found' };
      }
      const [existing] = await transaction
        .select({ id: checklistItemPhotos.id })
        .from(checklistItemPhotos)
        .where(eq(checklistItemPhotos.fileId, fileId));
      if (existing) return { status: 'invalid_state' };
      const active = await transaction
        .select({ position: checklistItemPhotos.position })
        .from(checklistItemPhotos)
        .where(and(eq(checklistItemPhotos.checklistItemId, itemId), isNull(checklistItemPhotos.deletedAt)));
      const position = nextPhotoPosition(active.map((photo) => photo.position));
      if (position === null) return { status: 'photo_limit_exceeded' };
      const [photo] = await transaction
        .insert(checklistItemPhotos)
        .values({ checklistItemId: itemId, fileId, position })
        .returning({ id: checklistItemPhotos.id });
      if (!photo) throw new Error('Не удалось привязать фотографию');
      return { status: 'ok', value: (await loadPhoto(transaction, photo.id))! };
    });
  }

  deletePhoto(photoId: number, actor: Actor): Promise<FileOperationResult<void>> {
    return this.#database.transaction(async (transaction) => {
      const [photo] = await transaction
        .select({ photo: checklistItemPhotos, file: files })
        .from(checklistItemPhotos)
        .innerJoin(files, eq(checklistItemPhotos.fileId, files.id))
        .where(and(eq(checklistItemPhotos.id, photoId), isNull(checklistItemPhotos.deletedAt)))
        .for('update');
      if (!photo) return { status: 'not_found' };
      await transaction.execute(sql`select pg_advisory_xact_lock(${photo.photo.checklistItemId})`);
      const context = await loadItemContext(transaction, photo.photo.checklistItemId);
      if (!context || !canReadStage(actor, context.stage.assigneeId)) return { status: 'not_found' };
      if (context.projectIsArchived) return { status: 'project_archived' };
      if (context.stage.status === 'completed' || context.stage.status === 'paid') return { status: 'invalid_state' };
      const now = new Date();
      await transaction.update(checklistItemPhotos).set({ deletedAt: now }).where(eq(checklistItemPhotos.id, photoId));
      await transaction.update(files).set({ expiresAt: now }).where(eq(files.id, photo.file.id));
      await clearCompletedItemAfterLastPhoto(transaction, context, photoId, now);
      return { status: 'ok', value: undefined };
    });
  }

  async findExpiredFileIds(now: Date): Promise<number[]> {
    const rows = await this.#database
      .select({ id: files.id })
      .from(files)
      .where(
        or(
          and(eq(files.status, 'pending'), lte(files.uploadExpiresAt, now)),
          and(eq(files.status, 'uploaded'), isNull(files.deletedAt), lte(files.expiresAt, now)),
        ),
      )
      .limit(100);
    return rows.map(({ id }) => id);
  }

  async deleteExpiredFile(fileId: number, now: Date): Promise<void> {
    const [file] = await this.#database.select().from(files).where(eq(files.id, fileId));
    if (!file) return;
    const isExpired =
      (file.status === 'pending' && file.uploadExpiresAt <= now) ||
      (file.status === 'uploaded' && file.expiresAt !== null && file.expiresAt <= now && file.deletedAt === null);
    if (!isExpired) return;
    await this.#storage.delete(file.storageKey);
    await this.#database.transaction(async (transaction) => {
      const [locked] = await transaction.select().from(files).where(eq(files.id, fileId)).for('update');
      if (!locked) return;
      await transaction
        .update(files)
        .set({ status: locked.status === 'pending' ? 'failed' : 'deleted', deletedAt: now })
        .where(eq(files.id, fileId));
      await transaction
        .update(checklistItemPhotos)
        .set({ deletedAt: now })
        .where(and(eq(checklistItemPhotos.fileId, fileId), isNull(checklistItemPhotos.deletedAt)));
    });
  }
}
