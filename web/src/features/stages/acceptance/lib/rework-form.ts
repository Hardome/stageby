import { z } from 'zod';

import { todayInYekaterinburg } from '@entities/project';

import { rejectStageSchema } from '@api/zod/rejectStageSchema';

export function reworkFormSchema(itemIds: number[], today = todayInYekaterinburg()) {
  const availableIds = new Set(itemIds);

  return rejectStageSchema.omit({ expectedVersion: true }).extend({
    correctionDueDate: rejectStageSchema.shape.correctionDueDate.unwrap().refine((date) => date >= today, {
      message: 'Срок не может быть раньше сегодняшнего дня.',
    }),
    items: rejectStageSchema.shape.items.element
      .extend({
        comment: z
          .string()
          .trim()
          .min(1, 'Укажите замечание к пункту.')
          .pipe(rejectStageSchema.shape.items.element.shape.comment),
      })
      .array()
      .min(1, 'Выберите хотя бы один пункт.')
      .refine((selected) => selected.every((item) => availableIds.has(item.itemId)), {
        message: 'Состав чек-листа изменился. Проверьте выбранные пункты.',
      })
      .refine((selected) => new Set(selected.map((item) => item.itemId)).size === selected.length, {
        message: 'Пункты не должны повторяться.',
      }),
  });
}

export function defaultCorrectionDate(today = todayInYekaterinburg()) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 2);

  return date.toISOString().slice(0, 10);
}
