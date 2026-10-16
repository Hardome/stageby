import { todayInYekaterinburg } from '@entities/project';

import { defaultCorrectionDate, reworkFormSchema } from './rework-form';

describe('rework validation', () => {
  const valid = { comment: ' Исправить угол ', itemIds: [211], correctionDueDate: '2026-10-17' };
  const schema = reworkFormSchema([211, 212], '2026-10-16');

  it('normalizes the comment and accepts today or a later deadline', () => {
    expect(schema.parse(valid).comment).toBe('Исправить угол');
    expect(schema.safeParse({ ...valid, correctionDueDate: '2026-10-16' }).success).toBe(true);
  });

  it.each([
    { comment: ' '.repeat(3) },
    { itemIds: [] },
    { itemIds: [211, 211] },
    { itemIds: [999] },
    { correctionDueDate: '2026-10-15' },
    { correctionDueDate: '2026-02-30' },
    { correctionDueDate: '' },
  ])('rejects invalid input %j', (change) => {
    expect(schema.safeParse({ ...valid, ...change }).success).toBe(false);
  });

  it('uses the Yekaterinburg day and advances across month and year boundaries', () => {
    expect(todayInYekaterinburg(new Date('2026-12-31T20:00:00Z'))).toBe('2027-01-01');
    expect(defaultCorrectionDate('2026-12-31')).toBe('2027-01-02');
    expect(defaultCorrectionDate('2028-02-28')).toBe('2028-03-01');
  });
});
