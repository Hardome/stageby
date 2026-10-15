import type { WorkPayment, WorkPlanRow } from '@api/types';

export function workRow(overrides: Partial<WorkPlanRow> = {}): WorkPlanRow {
  return {
    id: 21,
    stageId: 11,
    amountMinor: 10000n,
    recipientId: null,
    dueDate: null,
    version: 2,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

export function workPayment(overrides: Partial<WorkPayment> = {}): WorkPayment {
  return {
    id: 31,
    stageId: 11,
    workPlanRowId: 21,
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
