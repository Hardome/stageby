import { editStage } from '@tests/project-edit-fixture';

import { stageFormSchema, stageFormValues, stageUpdateRequest } from './stage-form';

describe('stage parameters', () => {
  it('sends only changes with version and distinguishes empty and zero plans', () => {
    const { stage } = editStage();
    const values = stageFormValues(stage);

    expect(stageUpdateRequest(stage, values)).toEqual({ expectedVersion: 3 });
    values.plannedWorkAmountMinor = '';
    values.plannedMaterialAmountMinor = '0';
    values.assignee = null;

    expect(stageUpdateRequest(stage, values)).toEqual({
      expectedVersion: 3,
      plannedWorkAmountMinor: null,
      plannedMaterialAmountMinor: 0n,
      assigneeId: null,
    });
  });

  it.each(['plannedStartDate', 'plannedEndDate'] as const)('clears %s independently', (key) => {
    const { stage } = editStage();
    const values = { ...stageFormValues(stage), [key]: '' };

    expect(stageFormSchema(stage).safeParse(values).success).toBe(true);
    expect(stageUpdateRequest(stage, values)).toEqual({ expectedVersion: 3, [key]: null });
  });

  it.each(['2026-09-30', '2027-01-01', '2026-02-30'])('rejects invalid or out of bounds date %s', (date) => {
    const { stage } = editStage();

    expect(stageFormSchema(stage).safeParse({ ...stageFormValues(stage), plannedStartDate: date }).success).toBe(false);
    expect(stageFormSchema(stage).safeParse({ ...stageFormValues(stage), plannedEndDate: date }).success).toBe(false);
  });

  it('rejects reversed dates and invalid amounts', () => {
    const { stage } = editStage();
    const values = stageFormValues(stage);

    expect(stageFormSchema(stage).safeParse({ ...values, plannedEndDate: '2026-10-02' }).success).toBe(false);
    for (const amount of ['-1', '1.5', '9007199254740992']) {
      expect(stageFormSchema(stage).safeParse({ ...values, plannedWorkAmountMinor: amount }).success).toBe(false);
    }
  });

  it('keeps paid stage plan present and within actual payments', () => {
    const { stage } = editStage({ status: 'paid', actualWorkAmountMinor: 10000n });
    const values = stageFormValues(stage);

    for (const amount of ['', '101']) {
      expect(stageFormSchema(stage).safeParse({ ...values, plannedWorkAmountMinor: amount }).success).toBe(false);
    }
    for (const amount of ['0', '100']) {
      expect(stageFormSchema(stage).safeParse({ ...values, plannedWorkAmountMinor: amount }).success).toBe(true);
    }
  });
});
