import type { FileRow } from '#app/db/schema/files';
import type { ChecklistItemPhoto, File } from '#app/generated/types.gen';

export function toFile(file: FileRow): File {
  if (!file.uploadedAt) throw new Error('Загруженный файл не содержит uploadedAt');
  return {
    id: file.id,
    purpose: file.purpose,
    status: file.status,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    checksumSha256: file.checksumSha256,
    uploadedAt: file.uploadedAt.toISOString(),
  };
}

export function toChecklistItemPhoto(row: {
  id: number;
  checklistItemId: number;
  fileId: number;
  position: number;
  uploadedByUserId: number;
  uploadedByName: string;
  uploadedAt: Date;
}): ChecklistItemPhoto {
  return {
    id: row.id,
    itemId: row.checklistItemId,
    fileId: row.fileId,
    position: row.position,
    uploadedBy: { id: row.uploadedByUserId, fullName: row.uploadedByName },
    uploadedAt: row.uploadedAt.toISOString(),
  };
}
