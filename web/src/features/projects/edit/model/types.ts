import type { ProjectEdit } from '@api/types';

export interface EditProjectFormProperties {
  initialStageId?: number;
  snapshot: ProjectEdit;
  onDirtyChange: (isDirty: boolean) => void;
  onCancel: () => void;
  onSuccess: (hasChanges?: boolean) => Promise<void>;
  onReload: () => Promise<void>;
}
