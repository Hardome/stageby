import { workFormDefaults, workFormSchema } from './work-form';

describe('work payment forms', () => {
  it.each(['', '0', '-1', '1.5', '999999999999999999'])('rejects invalid payment amount %s', (amount) => {
    const action = { kind: 'payment' as const };

    expect(workFormSchema(action).safeParse({ ...workFormDefaults(action), amount }).success).toBe(false);
  });

  it('accepts payments and due dates outside the project dates', () => {
    const action = { kind: 'payment' as const };

    expect(
      workFormSchema(action).safeParse({ ...workFormDefaults(action), amount: '1 200', date: '2030-01-01' }).success,
    ).toBe(true);
  });
});
