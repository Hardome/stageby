import type { ChecklistItem, ChecklistItemPhoto, Stage } from '@api/types';

export function hasCompletionPhoto(stage: Stage, item: ChecklistItem, photos: ChecklistItemPhoto[]) {
  if (!item.requiresRework) return photos.length > 0;

  const decision = stage.latestAcceptance;

  return (
    decision?.decision === 'rejected' &&
    photos.some((photo) => Date.parse(photo.uploadedAt) > Date.parse(decision.decidedAt))
  );
}
