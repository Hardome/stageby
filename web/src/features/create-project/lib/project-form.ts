import { z } from 'zod';

import type { CreateProject } from '@api/types';
import { createProjectChecklistItemSchema as checklistItemSchema } from '@api/zod/createProjectChecklistItemSchema';
import { createProjectSchema as contractSchema } from '@api/zod/createProjectSchema';
import { createProjectStageSchema as stageSchema } from '@api/zod/createProjectStageSchema';

import type { ProjectFormValues } from '../model/types';

const date = z.iso.date({ error: 'Укажите корректную дату.' });

export function parseCoordinates(value: string) {
  const parts = value.trim().split(',');

  if (parts.length !== 2 || parts.some((part) => !/^[+-]?\d+(?:\.\d+)?$/.test(part.trim()))) return;

  const [latitude, longitude] = parts.map(Number);
  const result = contractSchema.shape.coordinates.safeParse({ latitude, longitude });

  return result.success ? result.data : undefined;
}

export function parseAmount(value: string): bigint | null {
  let result: bigint | null = null;
  if (value.trim().length > 0) {
    const normalized = value.replaceAll(/\s/g, '');
    if (!/^\d+$/.test(normalized)) throw new Error('Введите целое неотрицательное число рублей.');
    result = BigInt(normalized) * 100n;
    if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Сумма слишком большая.');
  }
  return result;
}

const amount = z.string().superRefine((value, context) => {
  try {
    parseAmount(value);
  } catch (error) {
    context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Некорректная сумма.' });
  }
});

export const objectFormSchema = z
  .object({
    ownerName: contractSchema.shape.ownerName.trim().min(1, 'Укажите клиента.').max(150, 'Не более 150 символов.'),
    address: contractSchema.shape.address.trim().min(1, 'Укажите адрес.'),
    coordinates: z
      .string()
      .refine((value) => Boolean(parseCoordinates(value)), 'Введите широту и долготу через запятую: 55.7558, 37.6176.'),
    plannedStartDate: date,
    plannedEndDate: date,
  })
  .superRefine((values, context) => {
    if (values.plannedEndDate < values.plannedStartDate)
      context.addIssue({
        code: 'custom',
        path: ['plannedEndDate'],
        message: 'Окончание проекта не может быть раньше начала.',
      });
  });

const checklistDraftSchema = z.object({ title: z.string(), photoHint: z.string() });
const checklistFormSchema = checklistItemSchema.extend({
  title: z
    .string()
    .trim()
    .refine((value) => checklistItemSchema.shape.title.safeParse(value).success, {
      message: 'Введите название пункта (до 500 символов).',
    }),
  photoHint: z
    .string()
    .trim()
    .refine((value) => checklistItemSchema.shape.photoHint.safeParse(value || null).success, {
      message: 'Подсказка должна быть не длиннее 1000 символов.',
    }),
});
const stageDraftSchema = stageSchema.pick({ type: true, assigneeId: true }).extend({
  assigneeId: stageSchema.shape.assigneeId.nonoptional(),
  title: z.string(),
  enabled: z.literal(false),
  plannedStartDate: z.string(),
  plannedEndDate: z.string(),
  assigneeName: z.string(),
  plannedWorkAmount: z.string(),
  plannedMaterialAmount: z.string(),
  checklistItems: z.array(checklistDraftSchema),
});
const enabledStageSchema = stageDraftSchema
  .extend({
    enabled: z.literal(true),
    plannedStartDate: z.iso.date({ error: 'Укажите дату этапа.' }),
    plannedEndDate: z.iso.date({ error: 'Укажите дату этапа.' }),
    plannedWorkAmount: amount,
    plannedMaterialAmount: amount,
    checklistItems: z.array(checklistFormSchema).min(1, 'Добавьте хотя бы один пункт.'),
  })
  .refine((stage) => stage.plannedEndDate >= stage.plannedStartDate, {
    path: ['plannedEndDate'],
    message: 'Окончание этапа не может быть раньше начала.',
  });
const stageFormSchema = z.discriminatedUnion('enabled', [stageDraftSchema, enabledStageSchema]);

export const projectFormSchema = objectFormSchema
  .safeExtend({ stages: z.array(stageFormSchema) })
  .superRefine((values, context) => {
    if (values.stages.every((stage) => !stage.enabled))
      context.addIssue({ code: 'custom', path: ['stages'], message: 'Включите хотя бы один этап.' });
    for (const [index, stage] of values.stages.entries()) {
      if (!stage.enabled) continue;
      for (const field of ['plannedStartDate', 'plannedEndDate'] as const) {
        if (stage[field] < values.plannedStartDate || stage[field] > values.plannedEndDate)
          context.addIssue({
            code: 'custom',
            path: ['stages', index, field],
            message: 'Дата должна находиться внутри сроков проекта.',
          });
      }
    }
  });

export function projectRequest(values: ProjectFormValues, documentFileIds: number[]): CreateProject {
  const coordinates = parseCoordinates(values.coordinates);
  if (!coordinates) throw new Error('Некорректные координаты.');
  return {
    ownerName: values.ownerName.trim(),
    address: values.address.trim(),
    coordinates,
    plannedStartDate: values.plannedStartDate,
    plannedEndDate: values.plannedEndDate,
    documentFileIds,
    stages: values.stages
      .filter((stage) => stage.enabled)
      .map((stage) => ({
        type: stage.type,
        plannedStartDate: stage.plannedStartDate,
        plannedEndDate: stage.plannedEndDate,
        assigneeId: stage.assigneeId,
        plannedWorkAmountMinor: parseAmount(stage.plannedWorkAmount),
        plannedMaterialAmountMinor: parseAmount(stage.plannedMaterialAmount),
        checklistItems: stage.checklistItems.map((item) => ({
          title: item.title.trim(),
          photoHint: item.photoHint.trim() || null,
        })),
      })),
  };
}
