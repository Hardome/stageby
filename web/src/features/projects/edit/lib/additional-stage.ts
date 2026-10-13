import { type ProjectFormValues, parseAmount } from '@entities/project';

import type { CreateAdditionalStage } from '@api/types';

export function emptyAdditionalStage(): ProjectFormValues['stages'][number] {
  return {
    type: 'additional',
    title: 'Дополнительный этап',
    enabled: true,
    plannedStartDate: '',
    plannedEndDate: '',
    assigneeId: null,
    assigneeName: '',
    plannedWorkAmount: '',
    plannedMaterialAmount: '',
    checklistItems: [],
  };
}

export function additionalStageRequest(stage: ProjectFormValues['stages'][number]): CreateAdditionalStage {
  return {
    plannedStartDate: stage.plannedStartDate || null,
    plannedEndDate: stage.plannedEndDate || null,
    assigneeId: stage.assigneeId,
    plannedWorkAmountMinor: parseAmount(stage.plannedWorkAmount),
    plannedMaterialAmountMinor: parseAmount(stage.plannedMaterialAmount),
    checklistItems: stage.checklistItems.map((item) => ({
      title: item.title.trim(),
      photoHint: item.photoHint.trim() || null,
    })),
  };
}
