import { parseAmount, parseCoordinates, projectFormSchema } from '@entities/project';
import { testStageTypes, validForm } from '@tests/project-create-fixture';

import type { ActiveStageType } from '@api/types';

import { initialProjectForm } from '../model/data';
import { projectRequest } from './project-form';
import { projectErrorPath } from './use-project-submission';

describe('project-form', () => {
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
