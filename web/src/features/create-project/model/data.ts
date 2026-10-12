import type { ActiveStageType } from '@api/types';

import type { ProjectFormValues } from './types';

export const projectObjectFields = [
  'ownerName',
  'address',
  'coordinates',
  'plannedStartDate',
  'plannedEndDate',
] as const;

export function initialProjectForm(types: ActiveStageType[]): ProjectFormValues {
  return {
    ownerName: '',
    address: '',
    coordinates: '',
    plannedStartDate: '',
    plannedEndDate: '',
    stages: types
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
