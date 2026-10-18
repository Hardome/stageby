import { workPayment } from '@tests/work-payment-data';

import { executeWorkAction } from './execute-work-action';
import { workFormDefaults } from './work-form';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  paid: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@api/clients/createWorkPayment', () => ({ createWorkPayment: mocks.create }));
vi.mock('@api/clients/updateWorkPayment', () => ({ updateWorkPayment: mocks.update }));
vi.mock('@api/clients/changeStageStatus', () => ({ changeStageStatus: mocks.paid }));
vi.mock('@api/clients/deleteWorkPayment', () => ({ deleteWorkPayment: mocks.remove }));

beforeEach(() => {
  vi.clearAllMocks();
  for (const mock of Object.values(mocks)) mock.mockReturnValue({ unwrap: () => Promise.resolve() });
});

it('sends minor units and leaves recipient assignment and stage status to the server', async () => {
  const action = { kind: 'payment' as const };
  const values = { ...workFormDefaults(action), amount: '120', date: '2027-01-01', comment: ' Аванс ' };

  await executeWorkAction(11, action, values, 3);

  expect(mocks.create).toHaveBeenCalledExactlyOnceWith({
    path: { stageId: 11 },
    body: {
      amountMinor: 12000n,
      paidAt: '2027-01-01',
      comment: 'Аванс',
    },
  });
  expect(mocks.paid).not.toHaveBeenCalled();
});

it('edits a historical payment without copying the current stage assignee', async () => {
  const action = { kind: 'payment' as const, payment: workPayment() };

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

it('deletes a payment with its captured version', async () => {
  const action = { kind: 'delete-payment' as const, payment: workPayment() };
  await executeWorkAction(11, action, workFormDefaults(action), 3);
  expect(mocks.remove).toHaveBeenCalledWith({ path: { paymentId: 31 }, body: { expectedVersion: 3 } });
});
