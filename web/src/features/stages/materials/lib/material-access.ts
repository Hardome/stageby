import type { Stage } from '@api/types';

export function materialAccess(stage: Stage, user?: { id: number; role: string } | null) {
  const isEditable = stage.isIncluded && !stage.projectIsArchived;
  const canManage = isEditable && user?.role === 'manager';
  return {
    canManage,
    canReceive: canManage || (isEditable && user?.role === 'foreman' && stage.assignee?.id === user.id),
  };
}
