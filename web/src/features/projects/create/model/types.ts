import type { ActiveStageType } from '@api/types';

export interface CreateProjectFormProperties {
  types: ActiveStageType[];
  onDirtyChange: (isDirty: boolean) => void;
  onCancel: () => void;
  onSuccess: () => Promise<void>;
}
