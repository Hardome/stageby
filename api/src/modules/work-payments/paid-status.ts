import { eq, sql } from 'drizzle-orm';

import { type StageRow, stages } from '#app/db/schema/stages';
import { workPayments } from '#app/db/schema/work-payments';
import type { AuditWriter } from '#app/modules/audit/repository';
import type { Database } from '#app/modules/stages/types';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

// Вызывать под блокировкой этапа: выплаты и план должны соответствовать одному состоянию.
export async function paidStatus(transaction: Transaction, stage: StageRow): Promise<StageRow['status']> {
  if (stage.status !== 'completed' && stage.status !== 'paid') return stage.status;
  if (stage.plannedWorkAmountMinor === null) return 'completed';

  const [total] = await transaction
    .select({ amount: sql<number>`coalesce(sum(${workPayments.amountMinor}), 0)`.mapWith(Number) })
    .from(workPayments)
    .where(eq(workPayments.stageId, stage.id));

  return (total?.amount ?? 0) >= stage.plannedWorkAmountMinor ? 'paid' : 'completed';
}

export async function syncPaidStatus(transaction: Transaction, audit: AuditWriter, stage: StageRow): Promise<void> {
  const status = await paidStatus(transaction, stage);
  if (status === stage.status) return;

  await audit.mutate(stages, eq(stages.id, stage.id), () =>
    transaction
      .update(stages)
      .set({ status, version: sql`${stages.version} + 1`, updatedAt: new Date() })
      .where(eq(stages.id, stage.id)),
  );
}
