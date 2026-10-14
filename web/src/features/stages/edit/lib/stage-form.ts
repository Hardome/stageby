import { z } from 'zod';

import { parseAmount } from '@entities/project';

import type { Stage, UpdateStage } from '@api/types';
import { updateStageSchema } from '@api/zod/updateStageSchema';

export function stageFormValues(stage: Stage) {
  return {
    plannedStartDate: stage.plannedStartDate ?? '',
    plannedEndDate: stage.plannedEndDate ?? '',
    plannedWorkAmountMinor: stage.plannedWorkAmountMinor === null ? '' : String(stage.plannedWorkAmountMinor / 100n),
    plannedMaterialAmountMinor:
      stage.plannedMaterialAmountMinor === null ? '' : String(stage.plannedMaterialAmountMinor / 100n),
    assignee: stage.assignee ? { id: stage.assignee.id, label: stage.assignee.fullName } : null,
  };
}

export type StageFormValues = ReturnType<typeof stageFormValues>;

const date = z.union([z.literal(''), updateStageSchema.shape.plannedStartDate.unwrap().unwrap()]);
const amount = z.string().superRefine((value, context) => {
  try {
    const result = parseAmount(value);
    const parsed = updateStageSchema.shape.plannedWorkAmountMinor.safeParse(result);
    if (!parsed.success) context.addIssue({ code: 'custom', message: 'Некорректная сумма.' });
  } catch (error) {
    context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Некорректная сумма.' });
  }
});

export function stageFormSchema(stage: Stage) {
  return z
    .object({
      plannedStartDate: date,
      plannedEndDate: date,
      plannedWorkAmountMinor: amount,
      plannedMaterialAmountMinor: amount,
      assignee: z.object({ id: updateStageSchema.shape.assigneeId.unwrap().unwrap(), label: z.string() }).nullable(),
    })
    .superRefine((values, context) => {
      for (const key of ['plannedStartDate', 'plannedEndDate'] as const) {
        const value = values[key];
        if (value && (value < stage.projectPlannedStartDate || value > stage.projectPlannedEndDate)) {
          context.addIssue({ code: 'custom', path: [key], message: 'Дата должна быть в пределах срока проекта.' });
        }
      }
      if (values.plannedStartDate && values.plannedEndDate && values.plannedStartDate > values.plannedEndDate) {
        context.addIssue({
          code: 'custom',
          path: ['plannedEndDate'],
          message: 'Окончание не может быть раньше начала.',
        });
      }
      validatePaidPlan(stage, values.plannedWorkAmountMinor, context);
    });
}

function validatePaidPlan(stage: Stage, value: string, context: z.RefinementCtx) {
  if (stage.status !== 'paid') return;

  try {
    const plan = parseAmount(value);
    if (plan === null || plan > stage.actualWorkAmountMinor) {
      context.addIssue({
        code: 'custom',
        path: ['plannedWorkAmountMinor'],
        message: 'Для выплаченного этапа план обязателен и не может превышать факт выплат.',
      });
    }
  } catch {
    // Некорректную сумму проверяет схема денежного поля.
  }
}

export function stageUpdateRequest(stage: Stage, values: StageFormValues): UpdateStage {
  const body: UpdateStage = { expectedVersion: stage.version };
  const assigneeId = values.assignee?.id ?? null;
  if (assigneeId !== (stage.assignee?.id ?? null)) body.assigneeId = assigneeId;
  for (const key of ['plannedStartDate', 'plannedEndDate'] as const) {
    const value = values[key] || null;
    if (value !== stage[key]) body[key] = value;
  }
  for (const key of ['plannedWorkAmountMinor', 'plannedMaterialAmountMinor'] as const) {
    const value = parseAmount(values[key]);
    if (value !== stage[key]) body[key] = value;
  }

  return body;
}
