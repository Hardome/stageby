import { projectFormSchema } from '@entities/project';
import { validForm } from '@tests/project-create-fixture';

import { projectRequest } from './project-form';

describe('project-checklist-validation', () => {
  it('requires a stage and a nonempty checklist with meaningful titles', () => {
    const values = validForm();
    for (const stage of values.stages) stage.enabled = false;

    expect(projectFormSchema.safeParse(values).success).toBe(false);

    const stage = values.stages[0];
    if (!stage) throw new Error('Missing test stage');
    stage.enabled = true;
    stage.checklistItems = [];

    expect(projectFormSchema.safeParse(values).success).toBe(false);

    stage.checklistItems = [{ title: ' ', photoHint: '' }];

    expect(projectFormSchema.safeParse(values).success).toBe(false);
  });

  it('reports nested field errors and skips them only while the stage is excluded', () => {
    const values = validForm();
    const stage = values.stages[0];
    if (!stage) throw new Error('Missing test stage');
    stage.plannedWorkAmount = '-1';
    stage.plannedMaterialAmount = '90071992547410';
    stage.checklistItems = [{ title: 'x'.repeat(501), photoHint: 'x'.repeat(1001) }];
    const result = projectFormSchema.safeParse(values);

    expect(result.success).toBe(false);

    if (result.success) throw new Error('Expected validation errors');

    expect(result.error.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining([
        ['stages', 0, 'plannedWorkAmount'],
        ['stages', 0, 'plannedMaterialAmount'],
        ['stages', 0, 'checklistItems', 0, 'title'],
        ['stages', 0, 'checklistItems', 0, 'photoHint'],
      ]),
    );

    stage.enabled = false;

    expect(projectFormSchema.safeParse(values).success).toBe(true);

    stage.enabled = true;

    expect(projectFormSchema.safeParse(values).success).toBe(false);
  });

  it('validates trimmed checklist values against the contract and keeps empty hints optional', () => {
    const values = validForm();
    const stage = values.stages[0];
    if (!stage) throw new Error('Missing test stage');
    stage.checklistItems = [{ title: ` ${'x'.repeat(500)} `, photoHint: ' '.repeat(3) }];
    const parsed = projectFormSchema.parse(values);

    expect(parsed.stages[0]?.checklistItems[0]).toEqual({ title: 'x'.repeat(500), photoHint: '' });
    expect(projectRequest(parsed, []).stages[0]?.checklistItems?.[0]?.photoHint).toBeNull();

    stage.checklistItems[0] = { title: 'Пункт', photoHint: ` ${'x'.repeat(1000)} ` };

    expect(projectFormSchema.safeParse(values).success).toBe(true);
  });

  it('checks date relationships even when a checklist field is invalid', () => {
    const values = validForm();
    const stage = values.stages[0];
    if (!stage) throw new Error('Missing test stage');
    values.plannedEndDate = '2026-10-01';
    stage.plannedEndDate = '2026-10-04';
    stage.checklistItems = [{ title: '', photoHint: 'x'.repeat(1001) }];
    const result = projectFormSchema.safeParse(values);

    expect(result.success).toBe(false);

    if (result.success) throw new Error('Expected validation errors');

    expect(result.error.issues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining([
        ['plannedEndDate'],
        ['stages', 0, 'plannedEndDate'],
        ['stages', 0, 'checklistItems', 0, 'title'],
        ['stages', 0, 'checklistItems', 0, 'photoHint'],
      ]),
    );
  });
});
