import type { Stage } from '@api/types';

export function canEditWork(stage: Stage, role?: string) {
  return role === 'manager' && !stage.projectIsArchived && stage.isIncluded;
}
