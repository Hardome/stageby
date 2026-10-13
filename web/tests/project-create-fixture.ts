import { initialProjectForm } from '@features/projects/create/model/data';

import type { ActiveStageType } from '@api/types';
export const testStageTypes: ActiveStageType[] = [
  {
    code: 'foundation',
    title: 'Фундамент',
    position: 1,
    checklistTemplateId: 1,
    checklistItems: [{ id: 1, title: 'Армирование', photoHint: 'Фото углов', position: 1 }],
  },
  {
    code: 'walls',
    title: 'Стены',
    position: 2,
    checklistTemplateId: 2,
    checklistItems: [{ id: 2, title: 'Кладка', photoHint: null, position: 1 }],
  },
];

export function validForm() {
  const values = initialProjectForm(testStageTypes);
  Object.assign(values, {
    ownerName: ' Иван Иванов ',
    address: ' Екатеринбург ',
    coordinates: '56.8, 60.6',
    plannedStartDate: '2026-10-05',
    plannedEndDate: '2026-12-31',
  });
  for (const stage of values.stages)
    Object.assign(stage, {
      plannedStartDate: '2026-10-05',
      plannedEndDate: '2026-10-31',
    });

  return values;
}
