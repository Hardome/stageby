import type { CreateFileUpload, FilePurpose } from '#app/generated/types.gen';
import type { Actor, FileOperationError } from '#app/modules/files/types';

const bytesPerMiB = 1024 * 1024;

const policies: Record<FilePurpose, { mimeTypes: ReadonlySet<string>; maxSizeBytes: number }> = {
  project_document: { mimeTypes: new Set(['application/pdf']), maxSizeBytes: 50 * bytesPerMiB },
  checklist_photo: { mimeTypes: new Set(['image/jpeg', 'image/png', 'image/heic']), maxSizeBytes: 20 * bytesPerMiB },
  material_invoice: { mimeTypes: new Set(['application/pdf', 'image/jpeg']), maxSizeBytes: 10 * bytesPerMiB },
};

export function validateUploadPolicy(
  input: Pick<CreateFileUpload, 'purpose' | 'mimeType' | 'sizeBytes'>,
  actor: Actor,
): FileOperationError | null {
  if (actor.role !== 'manager' && input.purpose !== 'checklist_photo') return 'forbidden';
  const policy = policies[input.purpose];
  if (!policy.mimeTypes.has(input.mimeType)) return 'unsupported_mime_type';
  if (input.sizeBytes > policy.maxSizeBytes) return 'file_too_large';
  return null;
}

export function getMaximumSize(purpose: FilePurpose): number {
  return policies[purpose].maxSizeBytes;
}

export function isAllowedMimeType(purpose: FilePurpose, mimeType: string): boolean {
  return policies[purpose].mimeTypes.has(mimeType);
}
