import { workPayment, workRow } from '@tests/work-payment-data';

import type { WorkAction } from '../model/types';
import { isWorkActionUnchanged } from './work-changes';
import { workFormDefaults } from './work-form';

describe('unchanged payment edits', () => {
  it('compares stored values independently of amount formatting and recipient labels', () => {
    const action: WorkAction = { kind: 'row', row: workRow({ recipientId: 4, amountMinor: 100000n }) };
    const values = { ...workFormDefaults(action), amount: '1 000', recipient: { id: 4, label: 'Иван' } };

    expect(isWorkActionUnchanged(action, values)).toBe(true);
    expect(isWorkActionUnchanged(action, { ...values, date: '2027-01-01' })).toBe(false);
    expect(isWorkActionUnchanged(action, { ...values, recipient: null })).toBe(false);
  });

  it('skips payment updates for unchanged values and whitespace around comments', () => {
    const action: WorkAction = { kind: 'payment', rowId: 21, payment: workPayment() };
    const values = { ...workFormDefaults(action), comment: ' Аванс ' };

    expect(isWorkActionUnchanged(action, values)).toBe(true);
    expect(isWorkActionUnchanged(action, { ...values, amount: '61' })).toBe(false);
    expect(isWorkActionUnchanged(action, { ...values, comment: '' })).toBe(false);
  });

  it('always submits creation and explicit confirmation actions', () => {
    for (const action of [{ kind: 'row' }, { kind: 'payment', rowId: 21 }, { kind: 'paid' }] satisfies WorkAction[]) {
      expect(isWorkActionUnchanged(action, workFormDefaults(action))).toBe(false);
    }
  });
});
