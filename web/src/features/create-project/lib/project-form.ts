import { type ProjectFormValues, parseAmount, parseCoordinates } from '@entities/project';

import type { CreateProject } from '@api/types';

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
        plannedStartDate: stage.plannedStartDate || null,
        plannedEndDate: stage.plannedEndDate || null,
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
