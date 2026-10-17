import { editStage } from '@tests/project-edit-fixture';
import { workRow } from '@tests/work-payment-data';

import { canConfirmPaid } from './work-availability';
import { rowRequest, workFormDefaults, workFormSchema } from './work-form';

describe('work payment forms', () => {
  it('requires an explicit planned amount when adding a row', () => {
    const action = { kind: 'row' as const };
    const values = workFormDefaults(action);

    expect(values.amount).toBe('');
    expect(workFormSchema(action).safeParse(values).success).toBe(false);
    expect(workFormSchema(action).safeParse({ ...values, amount: '100' }).success).toBe(true);
  });

  it('accepts an explicit zero row and clears the recipient and date', () => {
    const action = { kind: 'row' as const };
    const values = { ...workFormDefaults(action), amount: '0' };

    expect(workFormSchema(action).safeParse(values).success).toBe(true);
    expect(rowRequest(values)).toEqual({ amountMinor: 0n, recipientId: null, dueDate: null });
  });

  it.each(['', '0', '-1', '1.5', '999999999999999999'])('rejects invalid payment amount %s', (amount) => {
    const action = { kind: 'payment' as const, rowId: 21 };

    expect(workFormSchema(action).safeParse({ ...workFormDefaults(action), amount }).success).toBe(false);
  });

  it('accepts payments and due dates outside the project dates', () => {
    const action = { kind: 'payment' as const, rowId: 21 };

    expect(
      workFormSchema(action).safeParse({ ...workFormDefaults(action), amount: '1 200', date: '2030-01-01' }).success,
    ).toBe(true);
    expect(rowRequest({ amount: '100', recipient: null, date: '2020-01-01' }).dueDate).toBe('2020-01-01');
  });

  it('requires an exact distribution total and at least two rows', () => {
    const action = { kind: 'distribute' as const, row: workRow() };
    const values = workFormDefaults(action);
    values.rows = [
      { amount: '60', recipient: null, date: '' },
      { amount: '40', recipient: null, date: '' },
    ];

    expect(workFormSchema(action).safeParse(values).success).toBe(true);

    values.rows = values.rows.map((row, index) => (index === 1 ? { ...row, amount: '41' } : row));
    expect(workFormSchema(action).safeParse(values).success).toBe(false);

    values.rows = [{ amount: '100', recipient: null, date: '' }];
    expect(workFormSchema(action).safeParse(values).success).toBe(false);
  });

  it.each([
    ['completed', 0n, 0n, true],
    ['completed', 100n, -100n, true],
    ['completed', null, null, false],
    ['completed', 100n, 100n, false],
    ['acceptance', 100n, 0n, false],
  ] as const)('checks explicit paid confirmation: %s, %s, %s', (status, plan, balance, expected) => {
    const stage = editStage({ status, plannedWorkAmountMinor: plan, workBalanceAmountMinor: balance }).stage;

    expect(canConfirmPaid(stage)).toBe(expected);
  });
});
