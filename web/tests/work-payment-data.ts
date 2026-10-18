import type { WorkPayment } from '@api/types';

export function workPayment(overrides: Partial<WorkPayment> = {}): WorkPayment {
  return {
    id: 31,
    stageId: 11,
    amountMinor: 6000n,
    paidAt: '2026-10-15',
    comment: 'Аванс',
    createdBy: { id: 1, fullName: 'Руководитель' },
    recipient: { id: 4, fullName: 'Иван' },
    version: 3,
    createdAt: '2026-10-15T00:00:00Z',
    updatedAt: '2026-10-15T00:00:00Z',
    ...overrides,
  };
}
