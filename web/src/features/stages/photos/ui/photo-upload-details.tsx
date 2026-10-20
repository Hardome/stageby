import { formatDateTime } from '@shared/lib/format-date-time';

import type { ChecklistItemPhoto } from '@api/types';

interface PhotoUploadDetailsProperties {
  photo: ChecklistItemPhoto;
}

export function PhotoUploadDetails({ photo }: PhotoUploadDetailsProperties) {
  return (
    <p className="wrap-anywhere flex flex-col gap-1 text-muted-foreground text-xs leading-normal">
      <span>{photo.uploadedBy.fullName}</span>
      <time dateTime={photo.uploadedAt}>{formatDateTime(photo.uploadedAt)}</time>
    </p>
  );
}
