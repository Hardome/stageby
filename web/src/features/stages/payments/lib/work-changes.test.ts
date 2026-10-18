import { workPayment } from '@tests/work-payment-data';

import { isWorkActionUnchanged } from './work-changes';
import { workFormDefaults } from './work-form';

it('detects an unchanged payment and edits to its amount, date or comment', () => {
  const action = { kind: 'payment' as const, payment: workPayment() };
  const values = workFormDefaults(action);
  expect(isWorkActionUnchanged(action, values)).toBe(true);
  for (const change of [{ amount: '100' }, { date: '2027-01-01' }, { comment: 'Другой комментарий' }])
    expect(isWorkActionUnchanged(action, { ...values, ...change })).toBe(false);
  expect(isWorkActionUnchanged({ kind: 'payment' }, values)).toBe(false);
});
