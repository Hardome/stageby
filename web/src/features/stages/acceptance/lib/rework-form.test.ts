import { todayInYekaterinburg } from '@entities/project';

import { defaultCorrectionDate, reworkFormSchema } from './rework-form';

describe('rework validation', () => {
  const valid = { items: [{ itemId: 211, comment: ' Исправить угол ' }], correctionDueDate: '2026-10-17' };
  const schema = reworkFormSchema([211, 212], '2026-10-16');

  it('normalizes the comment and accepts today or a later deadline', () => {
    expect(schema.parse(valid).items[0]?.comment).toBe('Исправить угол');
    expect(
      schema.parse({ ...valid, items: [{ itemId: 211, comment: ` ${'x'.repeat(5000)} ` }] }).items[0]?.comment,
    ).toHaveLength(5000);
    expect(schema.safeParse({ ...valid, correctionDueDate: '2026-10-16' }).success).toBe(true);
  });

  it.each([
    { items: [{ itemId: 211, comment: ' '.repeat(3) }] },
    { items: [{ itemId: 211, comment: 'x'.repeat(5001) }] },
    { items: [] },
    {
      items: [
        { itemId: 211, comment: 'a' },
        { itemId: 211, comment: 'b' },
      ],
    },
    { items: [{ itemId: 999, comment: 'a' }] },
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
