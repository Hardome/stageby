import type { ProjectStatusKey, StageStatusKey } from '@api/types';

export const projectStatuses: Record<ProjectStatusKey, string> = {
  created: 'Создан',
  in_progress: 'В работе',
  acceptance: 'Приёмка',
  completed: 'Выполнен',
};
export const stageStatuses: Record<StageStatusKey, string> = {
  created: 'Создан',
  assigned: 'Назначен',
  supplied: 'Укомплектован',
  in_progress: 'В работе',
  acceptance: 'Приёмка',
  rework: 'Доработка',
  completed: 'Выполнен',
  paid: 'Выплачен',
};
