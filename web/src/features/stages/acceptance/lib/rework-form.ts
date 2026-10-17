import { todayInYekaterinburg } from '@entities/project';

import { rejectStageSchema } from '@api/zod/rejectStageSchema';

export function reworkFormSchema(itemIds: number[], today = todayInYekaterinburg()) {
  const availableIds = new Set(itemIds);

  return rejectStageSchema.omit({ expectedVersion: true }).extend({
    comment: rejectStageSchema.shape.comment.trim().min(1, 'Укажите замечания.'),
    correctionDueDate: rejectStageSchema.shape.correctionDueDate.unwrap().refine((date) => date >= today, {
      message: 'Срок не может быть раньше сегодняшнего дня.',
    }),
    itemIds: rejectStageSchema.shape.itemIds.refine((selected) => selected.every((id) => availableIds.has(id)), {
      message: 'Состав чек-листа изменился. Проверьте выбранные пункты.',
    }),
  });
}

export function defaultCorrectionDate(today = todayInYekaterinburg()) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 2);

  return date.toISOString().slice(0, 10);
}
