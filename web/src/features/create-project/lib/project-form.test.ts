import type { ActiveStageType } from '@api/types';

import { initialProjectForm } from '../model/data';
import { objectFormSchema, parseAmount, parseCoordinates, projectFormSchema, projectRequest } from './project-form';
import { projectErrorPath } from './use-project-submission';

const testStageTypes: ActiveStageType[] = [
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

function validForm() {
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

describe('project creation validation', () => {
  it('initializes ordered template copies with all stages enabled and dates empty', () => {
    const values = initialProjectForm(testStageTypes.toReversed());
    expect(values.stages.map((stage) => stage.type)).toEqual(['foundation', 'walls']);
    expect(values.stages.every((stage) => stage.enabled && stage.plannedStartDate === '')).toBe(true);
    const item = values.stages[0]?.checklistItems[0];
    if (item) item.title = 'Изменено';
    expect(testStageTypes[0]?.checklistItems[0]?.title).toBe('Армирование');
  });

  it('excludes the additional stage that is available only when editing a project', () => {
    const additional: ActiveStageType = {
      code: 'additional',
      title: 'Дополнительный этап',
      position: 9,
      checklistTemplateId: null,
      checklistItems: [],
    };
    const values = initialProjectForm([...testStageTypes, additional]);
    expect(values.stages.map((stage) => stage.type)).toEqual(['foundation', 'walls']);
  });

  it.each(['90, 180', '-90, -180', ' 56.838011, 60.597474 '])('accepts coordinates %s', (value) => {
    expect(parseCoordinates(value)).toBeDefined();
  });
  it.each(['', ',60', '91,60', '56,-181', '56,60,1', '5e1,60', '56.8 60.6'])('rejects coordinates %s', (value) => {
    expect(parseCoordinates(value)).toBeUndefined();
  });

  it('keeps absent and zero plans distinct and converts whole rubles exactly', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('0')).toBe(0n);
    expect(parseAmount('1 800 000')).toBe(180000000n);
    expect(parseAmount('90 071 992 547 409')).toBe(9007199254740900n);
  });
  it.each(['-1', '1.5', '12x', '90071992547410'])('rejects invalid amount %s', (value) => {
    expect(() => parseAmount(value)).toThrow();
  });

  it('accepts overlapping stages and dates equal to project boundaries', () => {
    expect(projectFormSchema.safeParse(validForm()).success).toBe(true);
  });
  it.each([
    ['', ''],
    ['2026-10-05', ''],
    ['', '2026-12-31'],
    ['2026-10-05', '2026-12-31'],
  ])('accepts independent stage dates (%s, %s) and maps empty dates to null', (start, end) => {
    const values = validForm();
    const stage = values.stages[0];
    if (!stage) throw new Error('Missing test stage');
    stage.plannedStartDate = start;
    stage.plannedEndDate = end;
    expect(projectFormSchema.safeParse(values).success).toBe(true);
    expect(projectRequest(values, []).stages[0]).toMatchObject({
      plannedStartDate: start || null,
      plannedEndDate: end || null,
    });
  });
  it.each(['plannedStartDate', 'plannedEndDate'] as const)(
    'rejects an invalid or out-of-project %s when the other date is empty',
    (field) => {
      const values = validForm();
      const stage = values.stages[0];
      if (!stage) throw new Error('Missing test stage');
      stage.plannedStartDate = '';
      stage.plannedEndDate = '';
      for (const value of ['2026-10-04', '2027-01-01', '2026-02-31', 'invalid']) {
        stage[field] = value;
        const result = projectFormSchema.safeParse(values);
        expect(result.success).toBe(false);
        if (result.success) throw new Error('Expected validation errors');
        expect(result.error.issues.map((issue) => issue.path)).toContainEqual(['stages', 0, field]);
      }
    },
  );
  it('ignores excluded stage fields', () => {
    const values = validForm();
    const stage = values.stages[0];
    if (!stage) throw new Error('Missing test stage');
    stage.plannedStartDate = '';
    stage.enabled = false;
    stage.plannedWorkAmount = 'invalid';
    stage.checklistItems = [];
    expect(projectFormSchema.safeParse(values).success).toBe(true);
    expect(projectRequest(values, []).stages.map((item) => item.type)).toEqual(['walls']);
  });
  it('rejects reversed dates and dates outside the project', () => {
    const values = validForm();
    const stage = values.stages[0];
    if (!stage) throw new Error('Missing test stage');
    for (const end of ['2026-10-04', '2027-01-01']) {
      stage.plannedEndDate = end;
      expect(projectFormSchema.safeParse(values).success).toBe(false);
    }
    values.plannedEndDate = '2026-10-01';
    expect(objectFormSchema.safeParse(values).success).toBe(false);
  });
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
  it('builds the atomic request and maps server paths across excluded stages', () => {
    const values = validForm();
    const first = values.stages[0];
    const second = values.stages[1];
    if (!first || !second) throw new Error('Missing test stages');
    first.enabled = false;
    second.plannedWorkAmount = '0';
    const request = projectRequest(values, [41]);
    expect(request.ownerName).toBe('Иван Иванов');
    expect(request.documentFileIds).toEqual([41]);
    expect(request.stages[0]).toMatchObject({ plannedWorkAmountMinor: 0n, plannedMaterialAmountMinor: null });
    expect(projectErrorPath('body.stages.0.plannedWorkAmountMinor', values)).toBe('stages.1.plannedWorkAmount');
    expect(projectErrorPath('body.coordinates.latitude', values)).toBe('coordinates');
  });
});
