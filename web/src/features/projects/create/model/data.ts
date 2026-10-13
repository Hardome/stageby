import type { ProjectFormValues } from '@entities/project';

import type { ActiveStageType } from '@api/types';

export function initialProjectForm(types: ActiveStageType[]): ProjectFormValues {
  return {
    ownerName: '',
    address: '',
    coordinates: '',
    plannedStartDate: '',
    plannedEndDate: '',
    stages: types
      .filter((stage) => stage.code !== 'additional')
      .toSorted((first, second) => first.position - second.position)
      .map((stage) => ({
        type: stage.code,
        title: stage.title,
        enabled: true,
        plannedStartDate: '',
        plannedEndDate: '',
        assigneeId: null,
        assigneeName: '',
        plannedWorkAmount: '',
        plannedMaterialAmount: '',
        checklistItems: stage.checklistItems.map((item) => ({ title: item.title, photoHint: item.photoHint ?? '' })),
      })),
  };
}
