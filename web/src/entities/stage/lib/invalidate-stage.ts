import type { QueryClient } from '@tanstack/react-query';

import { getDashboardSummaryQueryKey } from '@api/queries/useGetDashboardSummary';
import { getProjectQueryKey } from '@api/queries/useGetProject';
import { getProjectEditQueryKey } from '@api/queries/useGetProjectEdit';
import { getStageQueryKey } from '@api/queries/useGetStage';
import { getStageChecklistQueryKey } from '@api/queries/useGetStageChecklist';
import { listDashboardProjectsQueryKey } from '@api/queries/useListDashboardProjects';
import { listProjectStagesQueryKey } from '@api/queries/useListProjectStages';
import { listProjectsQueryKey } from '@api/queries/useListProjects';
import { listStageMaterialInvoicesQueryKey } from '@api/queries/useListStageMaterialInvoices';
import { listStagesQueryKey } from '@api/queries/useListStages';
import type { Stage } from '@api/types';

export async function invalidateStage(client: QueryClient, stage: Stage) {
  const path = { projectId: stage.projectId };
  const keys = [
    getStageQueryKey({ path: { stageId: stage.id } }),
    getStageChecklistQueryKey({ path: { stageId: stage.id } }),
    listStageMaterialInvoicesQueryKey({ path: { stageId: stage.id } }),
    getProjectQueryKey({ path }),
    getProjectEditQueryKey({ path }),
    listProjectStagesQueryKey({ path }),
    listStagesQueryKey(),
    listProjectsQueryKey(),
    getDashboardSummaryQueryKey(),
    listDashboardProjectsQueryKey(),
  ];

  await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
}
