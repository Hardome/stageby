import type { ProjectEdit, ProjectEditStage, Stage } from '@api/types';

const timestamp = '2026-10-01T00:00:00Z';

export function editStage(overrides: Partial<Stage> = {}): ProjectEditStage {
  const stage: Stage = {
    id: 11,
    projectId: 1,
    projectOwnerName: 'Анна',
    projectAddress: 'Лесная, 10',
    projectCoordinates: { latitude: 56, longitude: 60 },
    projectIsArchived: false,
    type: 'foundation',
    title: 'Фундамент',
    position: 1,
    isIncluded: true,
    workSubtypes: [],
    assignee: { id: 4, fullName: 'Иван' },
    status: 'assigned',
    plannedStartDate: '2026-10-05',
    plannedEndDate: '2026-10-20',
    plannedWorkAmountMinor: 10000n,
    actualWorkAmountMinor: 0n,
    workBalanceAmountMinor: 10000n,
    plannedMaterialAmountMinor: null,
    actualMaterialAmountMinor: 0n,
    totalPlannedAmountMinor: null,
    totalActualAmountMinor: 0n,
    materialSummary: {
      color: 'red',
      invoiceCount: 0,
      paidInvoiceCount: 0,
      deliveredInvoiceCount: 0,
      openShortageCount: 0,
      isPartiallyPaid: false,
      isPartiallyDelivered: false,
    },
    actualStartDate: null,
    actualEndDate: null,
    predecessorStageIds: [],
    notes: null,
    progressPercent: 0,
    latestAcceptance: null,
    version: 3,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };

  return {
    stage,
    workPlanRows: [],
    checklist: {
      id: stage.id + 100,
      stageId: stage.id,
      version: 5,
      progressPercent: 0,
      warnings: [],
      createdAt: timestamp,
      updatedAt: timestamp,
      items: [
        {
          id: stage.id + 200,
          title: 'Армирование',
          photoHint: 'Фото углов',
          position: 1,
          isCompleted: false,
          requiresRework: false,
          photoCount: 0,
          photosDeletedByRetention: false,
          reworkComment: null,
          completedAt: null,
          completedBy: null,
        },
      ],
    },
  };
}

export function editSnapshot(): ProjectEdit {
  return {
    project: {
      id: 1,
      version: 7,
      status: 'created',
      ownerName: 'Анна',
      address: 'Лесная, 10',
      coordinates: { latitude: 56, longitude: 60 },
      cadastralNumber: null,
      houseDesign: null,
      contractLabel: null,
      plannedStartDate: '2026-10-01',
      plannedEndDate: '2026-12-31',
      notes: null,
      isArchived: false,
      documentFileIds: [81, 82],
      createdAt: timestamp,
      updatedAt: timestamp,
      finances: {
        plannedWorkAmountMinor: 10000n,
        actualWorkAmountMinor: 0n,
        plannedMaterialAmountMinor: null,
        actualMaterialAmountMinor: 0n,
        totalPlannedAmountMinor: null,
        totalActualAmountMinor: 0n,
        isPlanComplete: false,
        variancePercent: null,
      },
    },
    stages: [editStage(), editStage({ id: 12, type: 'walls', title: 'Стены', position: 2, isIncluded: false })],
  };
}
