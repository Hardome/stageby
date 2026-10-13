import { objectFormSchema, projectFormSchema } from '@entities/project';
import { testStageTypes, validForm } from '@tests/project-create-fixture';

import { initialProjectForm } from '../model/data';
import { projectRequest } from './project-form';

describe('project-stage-dates', () => {
  it('initializes ordered template copies with all stages enabled and dates empty', () => {
    const values = initialProjectForm(testStageTypes.toReversed());

    expect(values.stages.map((stage) => stage.type)).toEqual(['foundation', 'walls']);
    expect(values.stages.every((stage) => stage.enabled && stage.plannedStartDate === '')).toBe(true);

    const item = values.stages[0]?.checklistItems[0];
    if (item) item.title = 'Изменено';

    expect(testStageTypes[0]?.checklistItems[0]?.title).toBe('Армирование');
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
});
