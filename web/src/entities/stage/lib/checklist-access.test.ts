import { editStage } from '@tests/project-edit-fixture';

import { canEditChecklistComposition, canEditChecklistPhotos } from './checklist-access';

describe('checklist access', () => {
  it('locks the composition after actual start even when progress returns to zero', () => {
    const { stage } = editStage({ actualStartDate: '2026-10-15', status: 'assigned', progressPercent: 0 });
    expect(canEditChecklistComposition(stage, 'manager')).toBe(false);
    expect(canEditChecklistComposition(editStage().stage, 'manager')).toBe(true);
    expect(canEditChecklistComposition(editStage().stage, 'foreman')).toBe(false);
  });

  it('restricts foreman access on acceptance and rework while keeping manager access', () => {
    const { stage, checklist } = editStage({ status: 'acceptance' });
    const item = checklist.items[0];
    if (!item) throw new Error('Отсутствует тестовый пункт');
    expect(canEditChecklistPhotos(stage, item, 'foreman')).toBe(false);
    expect(canEditChecklistPhotos(stage, item, 'manager')).toBe(true);
    const rework = { ...stage, status: 'rework' as const };
    expect(canEditChecklistPhotos(rework, item, 'foreman')).toBe(false);
    expect(canEditChecklistPhotos(rework, { ...item, requiresRework: true }, 'foreman')).toBe(true);
    expect(canEditChecklistPhotos(rework, item, 'manager')).toBe(true);
  });

  it('allows only viewing completed, paid, archived and excluded stages', () => {
    for (const changes of [
      { status: 'completed' as const },
      { status: 'paid' as const },
      { projectIsArchived: true },
      { isIncluded: false },
    ]) {
      const { stage, checklist } = editStage(changes);
      const item = checklist.items[0];
      if (!item) throw new Error('Отсутствует тестовый пункт');
      for (const role of ['manager', 'foreman']) expect(canEditChecklistPhotos(stage, item, role)).toBe(false);
    }
  });
});
