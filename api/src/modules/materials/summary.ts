import { inArray, sql } from 'drizzle-orm';

import { stages } from '#app/db/schema/stages';
import type { MaterialIndicator } from '#app/generated/types.gen';
import type { Database } from '#app/modules/materials/types';

type Db = Database | Parameters<Parameters<Database['transaction']>[0]>[0];
type Counts = Pick<
  MaterialIndicator,
  'invoiceCount' | 'paidInvoiceCount' | 'deliveredInvoiceCount' | 'openShortageCount'
>;

export function isSupplyComplete(counts: Pick<Counts, 'invoiceCount' | 'deliveredInvoiceCount'>): boolean {
  return counts.invoiceCount > 0 && counts.deliveredInvoiceCount === counts.invoiceCount;
}

export function materialIndicator(counts: Counts): MaterialIndicator {
  let color: MaterialIndicator['color'] = 'yellow';
  if (counts.invoiceCount === 0 || counts.openShortageCount > 0) color = 'red';
  else if (counts.paidInvoiceCount === counts.invoiceCount && isSupplyComplete(counts)) color = 'green';
  return {
    invoiceCount: counts.invoiceCount,
    paidInvoiceCount: counts.paidInvoiceCount,
    deliveredInvoiceCount: counts.deliveredInvoiceCount,
    openShortageCount: counts.openShortageCount,
    color,
    isPartiallyPaid: counts.paidInvoiceCount > 0 && counts.paidInvoiceCount < counts.invoiceCount,
    isPartiallyDelivered: counts.deliveredInvoiceCount > 0 && counts.deliveredInvoiceCount < counts.invoiceCount,
  };
}

// Each aggregate reads its own relation, so payments, invoices and shortages cannot multiply one another.
// Accept a batch of stages for project and dashboard read models as well as a single stage.
export async function loadStageSummaries(db: Db, stageIds: number[]) {
  const rows = await db
    .select({
      id: stages.id,
      plannedWorkAmountMinor: stages.plannedWorkAmountMinor,
      plannedMaterialAmountMinor: stages.plannedMaterialAmountMinor,
      actualWorkAmountMinor:
        sql<number>`(select coalesce(sum(p."amountMinor"), 0) from work_payments p where p."stageId" = "stages"."id")`.mapWith(
          Number,
        ),
      actualMaterialAmountMinor:
        sql<number>`(select coalesce(sum(i."amountMinor"), 0) from material_invoices i where i."stageId" = "stages"."id" and i."paidAt" is not null)`.mapWith(
          Number,
        ),
      invoiceCount: sql<number>`(select count(*) from material_invoices i where i."stageId" = "stages"."id")`.mapWith(
        Number,
      ),
      paidInvoiceCount:
        sql<number>`(select count(*) from material_invoices i where i."stageId" = "stages"."id" and i."paidAt" is not null)`.mapWith(
          Number,
        ),
      deliveredInvoiceCount:
        sql<number>`(select count(*) from material_invoices i where i."stageId" = "stages"."id" and i."deliveredAt" is not null)`.mapWith(
          Number,
        ),
      openShortageCount:
        sql<number>`(select count(*) from material_shortages s join material_invoices i on i.id = s."invoiceId" where i."stageId" = "stages"."id" and s."resolvedAt" is null)`.mapWith(
          Number,
        ),
    })
    .from(stages)
    .where(inArray(stages.id, stageIds));
  return new Map(
    rows.map((row) => [
      row.id,
      {
        plannedWorkAmountMinor: row.plannedWorkAmountMinor,
        actualWorkAmountMinor: row.actualWorkAmountMinor,
        workBalanceAmountMinor:
          row.plannedWorkAmountMinor === null ? null : row.plannedWorkAmountMinor - row.actualWorkAmountMinor,
        plannedMaterialAmountMinor: row.plannedMaterialAmountMinor,
        actualMaterialAmountMinor: row.actualMaterialAmountMinor,
        totalPlannedAmountMinor:
          row.plannedWorkAmountMinor === null || row.plannedMaterialAmountMinor === null
            ? null
            : row.plannedWorkAmountMinor + row.plannedMaterialAmountMinor,
        totalActualAmountMinor: row.actualWorkAmountMinor + row.actualMaterialAmountMinor,
        materialSummary: materialIndicator(row),
      },
    ]),
  );
}
