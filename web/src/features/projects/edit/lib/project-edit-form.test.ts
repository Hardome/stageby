import { editSnapshot, editStage } from '@tests/project-edit-fixture';

import { editErrorPath, projectEditRequest, projectEditSchema, projectEditValues } from './project-edit-form';

describe('project editing request', () => {
  it('loads excluded stages, nullable amounts and assignee names without creating missing stages', () => {
    const snapshot = editSnapshot();
    snapshot.stages[0] = editStage({ plannedWorkAmountMinor: 0n });
    const values = projectEditValues(snapshot);

    expect(values.stages).toHaveLength(2);
    expect(values.stages[0]).toMatchObject({ plannedWorkAmount: '0', plannedMaterialAmount: '', assigneeName: 'Иван' });
    expect(values.stages[1]?.enabled).toBe(false);
    expect(projectEditSchema(snapshot).safeParse(values).success).toBe(true);
  });

  it('omits untouched fields and resources, including checklist IDs and payment rows', () => {
    const snapshot = editSnapshot();
    const values = projectEditValues(snapshot);

    expect(projectEditRequest(snapshot, values, [81, 82])).toEqual({ expectedVersion: 7 });

    values.ownerName = ' Мария ';

    expect(projectEditRequest(snapshot, values, [81, 82])).toEqual({ expectedVersion: 7, ownerName: 'Мария' });
  });

  it('restores the same stage and sends changed dates, plans and checklist with original versions', () => {
    const snapshot = editSnapshot();
    const values = projectEditValues(snapshot);
    const stage = values.stages[1];
    if (!stage) throw new Error('Missing stage');
    stage.enabled = true;
    stage.plannedStartDate = '';
    stage.plannedWorkAmount = '';
    stage.plannedMaterialAmount = '0';
    stage.checklistItems.push({ title: ' Проверить стены ', photoHint: '' });
    const body = projectEditRequest(snapshot, values, [82, 90]);

    expect(body).toEqual({
      expectedVersion: 7,
      documentFileIds: [82, 90],
      stages: [
        {
          id: 12,
          expectedVersion: 3,
          isIncluded: true,
          plannedStartDate: null,
          plannedWorkAmountMinor: null,
          plannedMaterialAmountMinor: 0n,
          checklist: {
            expectedVersion: 5,
            items: [
              { title: 'Армирование', photoHint: 'Фото углов' },
              { title: 'Проверить стены', photoHint: null },
            ],
          },
        },
      ],
    });
    expect(body).not.toHaveProperty('additionalStage');
    expect(body.stages?.[0]).not.toHaveProperty('workPlanRows');
  });

  it('excludes stages explicitly and keeps their edits and history out of the request', () => {
    const snapshot = editSnapshot();
    const values = projectEditValues(snapshot);
    const first = values.stages[0];
    const second = values.stages[1];
    if (!first || !second) throw new Error('Missing stages');
    first.enabled = false;
    first.checklistItems = [];
    first.plannedWorkAmount = 'invalid';
    second.enabled = true;

    expect(projectEditSchema(snapshot).safeParse(values).success).toBe(true);
    expect(projectEditRequest(snapshot, values, [81, 82]).stages).toEqual([
      { id: 11, expectedVersion: 3, isIncluded: false },
      { id: 12, expectedVersion: 3, isIncluded: true },
    ]);

    second.enabled = false;

    expect(projectEditSchema(snapshot).safeParse(values).success).toBe(false);
  });

  it('validates independent dates and project bounds', () => {
    const snapshot = editSnapshot();
    const values = projectEditValues(snapshot);
    const stage = values.stages[0];
    if (!stage) throw new Error('Missing stage');
    stage.plannedStartDate = '';

    expect(projectEditSchema(snapshot).safeParse(values).success).toBe(true);

    stage.plannedEndDate = '2027-01-01';

    expect(projectEditSchema(snapshot).safeParse(values).success).toBe(false);

    stage.plannedStartDate = '2026-10-30';
    stage.plannedEndDate = '2026-10-20';

    expect(projectEditSchema(snapshot).safeParse(values).success).toBe(false);
  });

  it('protects started checklists and the paid work plan invariant', () => {
    const snapshot = editSnapshot();
    snapshot.stages[0] = editStage({ actualStartDate: '2026-10-05', status: 'paid', actualWorkAmountMinor: 10000n });
    const values = projectEditValues(snapshot);
    const stage = values.stages[0];
    if (!stage) throw new Error('Missing stage');
    stage.checklistItems[0] = { title: 'Changed', photoHint: '' };

    expect(projectEditRequest(snapshot, values, [81, 82]).stages).toBeUndefined();

    stage.plannedWorkAmount = '';

    expect(projectEditSchema(snapshot).safeParse(values).success).toBe(false);

    stage.plannedWorkAmount = '101';

    expect(projectEditSchema(snapshot).safeParse(values).success).toBe(false);

    stage.plannedWorkAmount = '100';

    expect(projectEditSchema(snapshot).safeParse(values).success).toBe(true);

    stage.enabled = false;

    expect(projectEditSchema(snapshot).safeParse(values).success).toBe(false);
  });

  it('maps compact PATCH indexes back to the form and nested checklist fields', () => {
    const snapshot = editSnapshot();
    const body = { expectedVersion: 7, stages: [{ id: 12, expectedVersion: 3 }] };

    expect(editErrorPath('body.stages.0.checklist.items.0.title', body, snapshot)).toBe(
      'stages.1.checklistItems.0.title',
    );
    expect(editErrorPath('body.stages.0.isIncluded', body, snapshot)).toBe('stages.1.enabled');
    expect(editErrorPath('body.stages.0.plannedWorkAmountMinor', body, snapshot)).toBe('stages.1.plannedWorkAmount');
    expect(editErrorPath('body.coordinates.latitude', body, snapshot)).toBe('coordinates');
    expect(editErrorPath('body.documentFileIds.0', body, snapshot)).toBe('documentFileIds.0');
  });
});
