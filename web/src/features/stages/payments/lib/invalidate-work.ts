import type { QueryClient } from '@tanstack/react-query';

import { invalidateStage } from '@entities/stage';

import { getWorkPlanRowQueryKey } from '@api/queries/useGetWorkPlanRow';
import { listWorkPaymentsQueryKey } from '@api/queries/useListWorkPayments';
import { listWorkPlanRowsQueryKey } from '@api/queries/useListWorkPlanRows';
import type { Stage } from '@api/types';

export async function invalidateWork(client: QueryClient, stage: Stage, rowId?: number) {
  const path = { stageId: stage.id };

  await Promise.all([
    invalidateStage(client, stage),
    client.invalidateQueries({ queryKey: listWorkPlanRowsQueryKey({ path }) }),
    client.invalidateQueries({ queryKey: listWorkPaymentsQueryKey({ path }) }),
    ...(rowId ? [client.invalidateQueries({ queryKey: getWorkPlanRowQueryKey({ path: { rowId } }) })] : []),
  ]);
}
