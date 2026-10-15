import type { DashboardProjectRow, DashboardSummary } from '@api/types';

const finances = {
  plannedWorkAmountMinor: 10000n,
  actualWorkAmountMinor: 12000n,
  workBalanceAmountMinor: -2000n,
  plannedMaterialAmountMinor: null,
  actualMaterialAmountMinor: 0n,
  totalPlannedAmountMinor: null,
  totalActualAmountMinor: 12000n,
  isPlanComplete: false,
  variancePercent: null,
};

export const dashboardProject: DashboardProjectRow = {
  projectId: 7,
  ownerName: 'Анна',
  address: 'Лесная, 10',
  status: 'in_progress',
  finances,
  selectedStage: {
    stageId: 11,
    position: 1,
    stageCount: 3,
    title: 'Фундамент',
    plannedStartDate: '2026-10-11',
    plannedEndDate: null,
    assignee: null,
    status: 'completed',
    progressPercent: 100,
    finances,
    materials: {
      color: 'yellow',
      invoiceCount: 2,
      paidInvoiceCount: 1,
      deliveredInvoiceCount: 0,
      openShortageCount: 0,
      isPartiallyPaid: true,
      isPartiallyDelivered: false,
    },
  },
};

export const dashboardSummary: DashboardSummary = {
  through: '2026-10-04',
  activeProjectCount: 1,
  works: { plannedAmountMinor: 10000n, actualAmountMinor: 12000n, balanceAmountMinor: -2000n, isPlanComplete: true },
  materials: { plannedAmountMinor: null, actualAmountMinor: 0n, balanceAmountMinor: null, isPlanComplete: false },
  total: { plannedAmountMinor: 0n, actualAmountMinor: 0n, balanceAmountMinor: 0n, isPlanComplete: true },
};
