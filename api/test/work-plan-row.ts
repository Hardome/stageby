import { workPlanRows } from '#app/db/schema/work-plan-rows';
import type { Database } from '#app/modules/stages/types';

export async function createPaymentPlanRow(db: Database, stageId: number, recipientId: number) {
  const [row] = await db.insert(workPlanRows).values({ stageId, recipientId, amountMinor: 0 }).returning();
  return row!;
}
