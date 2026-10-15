import { workPayment, workRow } from '@tests/work-payment-data';

import { executeWorkAction } from './execute-work-action';
import { workFormDefaults } from './work-form';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  distribute: vi.fn(),
  paid: vi.fn(),
  row: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@api/clients/createWorkPayment', () => ({ createWorkPayment: mocks.create }));
vi.mock('@api/clients/updateWorkPayment', () => ({ updateWorkPayment: mocks.update }));
vi.mock('@api/clients/distributeWorkPlanRow', () => ({ distributeWorkPlanRow: mocks.distribute }));
vi.mock('@api/clients/changeStageStatus', () => ({ changeStageStatus: mocks.paid }));
vi.mock('@api/clients/updateWorkPlanRow', () => ({ updateWorkPlanRow: mocks.row }));
vi.mock('@api/clients/deleteWorkPayment', () => ({ deleteWorkPayment: mocks.remove }));

beforeEach(() => {
  vi.clearAllMocks();
  for (const mock of Object.values(mocks)) mock.mockReturnValue({ unwrap: () => Promise.resolve() });
});

it('sends minor units and leaves recipient assignment and stage status to the server', async () => {
  const action = { kind: 'payment' as const, rowId: 21 };
  const values = { ...workFormDefaults(action), amount: '120', date: '2027-01-01', comment: ' Аванс ' };

  await executeWorkAction(11, action, values, 3);

  expect(mocks.create).toHaveBeenCalledExactlyOnceWith({
    path: { stageId: 11 },
    body: {
      workPlanRowId: 21,
      amountMinor: 12000n,
      paidAt: '2027-01-01',
      comment: 'Аванс',
    },
  });
  expect(mocks.paid).not.toHaveBeenCalled();
});

it('edits a historical payment without copying the current row recipient', async () => {
  const action = { kind: 'payment' as const, rowId: 21, payment: workPayment() };

  await executeWorkAction(11, action, workFormDefaults(action), 8);

  expect(mocks.update).toHaveBeenCalledWith({
    path: { paymentId: 31 },
    body: {
      expectedVersion: 8,
      amountMinor: 6000n,
      paidAt: '2026-10-15',
      comment: 'Аванс',
    },
  });
});

it('replaces a row through the single atomic distribution endpoint', async () => {
  const action = { kind: 'distribute' as const, row: workRow() };
  const values = workFormDefaults(action);
  values.rows = [
    { amount: '60', recipient: { id: 4, label: 'Иван' }, date: '' },
    { amount: '40', recipient: null, date: '' },
  ];

  await executeWorkAction(11, action, values, 7);

  expect(mocks.distribute).toHaveBeenCalledExactlyOnceWith({
    path: { rowId: 21 },
    body: {
      expectedVersion: 7,
      rows: [
        { amountMinor: 6000n, recipientId: 4, dueDate: null },
        { amountMinor: 4000n, recipientId: null, dueDate: null },
      ],
    },
  });
});

it('deletes payments and confirms paid with the captured version', async () => {
  const action = { kind: 'delete-payment' as const, payment: workPayment() };

  await executeWorkAction(11, action, workFormDefaults(action), 9);
  await executeWorkAction(11, { kind: 'paid' }, workFormDefaults({ kind: 'paid' }), 10);

  expect(mocks.remove).toHaveBeenCalledWith({ path: { paymentId: 31 }, body: { expectedVersion: 9 } });
  expect(mocks.paid).toHaveBeenCalledWith({ path: { stageId: 11 }, body: { expectedVersion: 10, status: 'paid' } });
});

it('keeps an unchanged inactive recipient when editing a historical row', async () => {
  const action = { kind: 'row' as const, row: workRow({ recipientId: 4 }) };
  const values = { ...workFormDefaults(action), date: '2027-01-01' };

  await executeWorkAction(11, action, values, 5);

  expect(mocks.row).toHaveBeenCalledWith({ path: { rowId: 21 }, body: { expectedVersion: 5, dueDate: '2027-01-01' } });
});

it.each([null, 8])('changes only the current row recipient to %s', async (recipientId) => {
  const action = { kind: 'row' as const, row: workRow({ recipientId: 4, dueDate: '2026-10-01' }) };
  const values = {
    ...workFormDefaults(action),
    recipient: recipientId ? { id: recipientId, label: 'Пётр' } : null,
    date: '',
  };

  await executeWorkAction(11, action, values, 5);

  expect(mocks.row).toHaveBeenCalledWith({
    path: { rowId: 21 },
    body: { expectedVersion: 5, recipientId, dueDate: null },
  });
  expect(mocks.update).not.toHaveBeenCalled();
});
