import { eq, sql } from 'drizzle-orm';

import type { StageRow } from '#app/db/schema/stages';
import { workPayments } from '#app/db/schema/work-payments';
import type { Database } from '#app/modules/stages/types';

type Db = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

// Call while holding the stage lock; all payment and stage-plan writes use that lock.
export async function preservesPaidInvariant(db: Db, stage: StageRow, amountDelta = 0): Promise<boolean> {
  if (stage.status !== 'paid') return true;
  if (stage.plannedWorkAmountMinor === null) return false;
  const [total] = await db
    .select({ amount: sql<number>`coalesce(sum(${workPayments.amountMinor}), 0)`.mapWith(Number) })
    .from(workPayments)
    .where(eq(workPayments.stageId, stage.id));
  return stage.plannedWorkAmountMinor - (total!.amount + amountDelta) <= 0;
}
