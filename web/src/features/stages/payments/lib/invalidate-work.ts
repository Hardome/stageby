import type { QueryClient } from '@tanstack/react-query';

import { invalidateStage } from '@entities/stage';

import { listWorkPaymentsQueryKey } from '@api/queries/useListWorkPayments';
import type { Stage } from '@api/types';

export async function invalidateWork(client: QueryClient, stage: Stage) {
  const path = { stageId: stage.id };

  await Promise.all([
    invalidateStage(client, stage),
    client.invalidateQueries({ queryKey: listWorkPaymentsQueryKey({ path }) }),
  ]);
}
