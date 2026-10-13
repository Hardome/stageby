import { editSnapshot, editStage } from '@tests/project-edit-fixture';

import { createAdditionalStageSchema as additionalStageSchema } from '@api/zod/createAdditionalStageSchema';

import { emptyAdditionalStage } from './additional-stage';
import { editErrorPath, projectEditRequest, projectEditSchema, projectEditValues } from './project-edit-form';

describe('additional stage request', () => {
  it('starts with a fixed title and empty checklist and validates included stages', () => {
    const snapshot = editSnapshot();
    const values = projectEditValues(snapshot);
    const stage = emptyAdditionalStage();
    values.stages.push(stage);

    expect(stage).toMatchObject({ type: 'additional', title: 'Дополнительный этап', checklistItems: [] });
    expect(projectEditSchema(snapshot).safeParse(values).success).toBe(false);

    stage.checklistItems.push({ title: 'Проверка', photoHint: '' });

    expect(projectEditSchema(snapshot).safeParse(values).success).toBe(true);

    stage.plannedEndDate = '2027-01-01';

    expect(projectEditSchema(snapshot).safeParse(values).success).toBe(false);

    stage.enabled = false;

    expect(projectEditSchema(snapshot).safeParse(values).success).toBe(true);
    expect(projectEditRequest(snapshot, values, [81, 82])).not.toHaveProperty('additionalStage');
  });

  it('includes the new stage, project edits and existing resource versions in one partial PATCH', () => {
    const snapshot = editSnapshot();
    snapshot.project.status = 'completed';
    const values = projectEditValues(snapshot);
    values.ownerName = 'Мария';
    const existing = values.stages[0];
    if (!existing) throw new Error('Missing stage');
    existing.checklistItems.push({ title: 'Контроль', photoHint: '' });
    const stage = emptyAdditionalStage();
    stage.plannedEndDate = '2026-12-30';
    stage.assigneeId = 4;
    stage.plannedWorkAmount = '0';
    stage.plannedMaterialAmount = '500';
    stage.checklistItems = [{ title: ' Проверка ', photoHint: ' Фото ' }];
    values.stages.push(stage);

    const body = projectEditRequest(snapshot, values, [82]);

    expect(body).toEqual({
      expectedVersion: 7,
      ownerName: 'Мария',
      documentFileIds: [82],
      stages: [
        {
          id: 11,
          expectedVersion: 3,
          checklist: {
            expectedVersion: 5,
            items: [
              { title: 'Армирование', photoHint: 'Фото углов' },
              { title: 'Контроль', photoHint: null },
            ],
          },
        },
      ],
      additionalStage: {
        plannedStartDate: null,
        plannedEndDate: '2026-12-30',
        assigneeId: 4,
        plannedWorkAmountMinor: 0n,
        plannedMaterialAmountMinor: 50000n,
        checklistItems: [{ title: 'Проверка', photoHint: 'Фото' }],
      },
    });
    expect(additionalStageSchema.safeParse(body.additionalStage).success).toBe(true);
  });

  it('restores the same excluded stage and leaves its checklist and payment history untouched', () => {
    const snapshot = editSnapshot();
    snapshot.stages.push(editStage({ id: 19, type: 'additional', title: 'Дополнительный этап', isIncluded: false }));
    const values = projectEditValues(snapshot);
    const stage = values.stages[2];
    if (!stage) throw new Error('Missing additional stage');
    stage.enabled = true;

    expect(projectEditRequest(snapshot, values, [81, 82])).toEqual({
      expectedVersion: 7,
      stages: [{ id: 19, expectedVersion: 3, isIncluded: true }],
    });

    values.stages.push({ ...emptyAdditionalStage(), checklistItems: [{ title: 'Повтор', photoHint: '' }] });

    expect(projectEditSchema(snapshot).safeParse(values).success).toBe(false);
  });

  it.each([
    ['additionalStage', 'stages.2'],
    ['additionalStage.checklistItems', 'stages.2.checklistItems'],
    ['additionalStage.checklistItems.0.title', 'stages.2.checklistItems.0.title'],
    ['additionalStage.assigneeId', 'stages.2.assigneeId'],
    ['additionalStage.plannedEndDate', 'stages.2.plannedEndDate'],
    ['additionalStage.plannedWorkAmountMinor', 'stages.2.plannedWorkAmount'],
    ['additionalStage.plannedMaterialAmountMinor', 'stages.2.plannedMaterialAmount'],
  ])('maps the new stage error %s to the form', (path, field) => {
    const snapshot = editSnapshot();
    const values = projectEditValues(snapshot);
    values.stages.push(emptyAdditionalStage());
    const body = projectEditRequest(snapshot, values, [81, 82]);

    expect(editErrorPath(`body.${path}`, body, snapshot)).toBe(field);
  });
});
