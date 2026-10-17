import type { ChecklistItem, Stage } from '@api/types';

export function canEditChecklistComposition(stage: Stage, role?: string) {
  return role === 'manager' && stage.isIncluded && !stage.projectIsArchived && stage.actualStartDate === null;
}

export function canEditChecklistPhotos(stage: Stage, item: ChecklistItem, role?: string) {
  if (!stage.isIncluded || stage.projectIsArchived || stage.status === 'completed' || stage.status === 'paid')
    return false;
  if (role !== 'manager' && role !== 'foreman') return false;
  if (role === 'manager') return true;
  if (role === 'foreman' && stage.status === 'acceptance') return false;

  return role === 'foreman' && stage.status === 'rework' ? item.requiresRework : stage.status !== 'created';
}
