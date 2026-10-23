import { formatDateTime } from '@shared/lib/format-date-time';

import type { ChecklistItemPhoto } from '@api/types';

interface PhotoUploadDetailsProperties {
  photo: ChecklistItemPhoto;
}

export function PhotoUploadDetails({ photo }: Readonly<PhotoUploadDetailsProperties>) {
  return (
    <p className="flex flex-col gap-1 text-xs leading-normal wrap-anywhere text-muted-foreground">
      <span>{photo.uploadedBy.fullName}</span>
      <time dateTime={photo.uploadedAt}>{formatDateTime(photo.uploadedAt)}</time>
    </p>
  );
}
