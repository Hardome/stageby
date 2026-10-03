import { and, eq, getTableColumns, getTableName, or, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';

import { auditChanges, auditEvents } from '#app/db/schema/audit';
import * as schema from '#app/db/schema/index';
import type { AuditContext } from '#app/modules/audit/context';
import { snapshot } from '#app/modules/audit/snapshots';

type Database = NodePgDatabase<typeof schema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type Row = Record<string, unknown>;
export type AuditChange = Omit<typeof auditChanges.$inferInsert, 'id' | 'eventId'>;

export async function append(
  transaction: Transaction,
  context: AuditContext,
  operation: string,
  changes: AuditChange[],
): Promise<void> {
  const [event] = await transaction
    .insert(auditEvents)
    .values({ ...context, operation })
    .returning({ id: auditEvents.id });
  if (!event) throw new Error('Audit event was not inserted');
  if (changes.length > 0)
    await transaction.insert(auditChanges).values(changes.map((change) => ({ ...change, eventId: event.id })));
}

/** Collects explicitly tracked writes, locking rows before changes and reading them afterwards by primary key. */
export class AuditWriter {
  readonly #transaction: Transaction;
  readonly #changes = new Map<string, AuditChange>();
  #recordEmptyEvent = false;

  constructor(transaction: Transaction) {
    this.#transaction = transaction;
  }

  get changes(): AuditChange[] {
    return [...this.#changes.values()].filter(
      (change) => JSON.stringify(change.before) !== JSON.stringify(change.after),
    );
  }

  recordEvent(): void {
    this.#recordEmptyEvent = true;
  }

  get hasEvent(): boolean {
    return this.#recordEmptyEvent || this.changes.length > 0;
  }

  async created<T extends Row>(table: PgTable, rows: T[]): Promise<T[]> {
    for (const row of rows) await this.#record(table, null, row);
    return rows;
  }

  async mutate<T>(table: PgTable, where: SQL | undefined, write: () => PromiseLike<T>): Promise<T> {
    const before = await this.#transaction.select().from(table).where(where).for('update');
    const result = await write();
    if (before.length === 0) return result;
    const keys = before.map((row) => this.#key(table, row));
    const columns = getTableColumns(table);
    const after = await this.#transaction
      .select()
      .from(table)
      .where(or(...keys.map((key) => and(...Object.entries(key).map(([name, value]) => eq(columns[name]!, value))))));
    const afterByKey = new Map(after.map((row) => [JSON.stringify(this.#key(table, row)), row]));
    for (const row of before)
      await this.#record(table, row, afterByKey.get(JSON.stringify(this.#key(table, row))) ?? null);
    return result;
  }

  #key(table: PgTable, row: Row): Row {
    const config = getTableConfig(table);
    const columns = config.columns.filter((column) => column.primary);
    const primary = columns.length > 0 ? columns : config.primaryKeys.flatMap((key) => key.columns);
    if (primary.length === 0) throw new Error(`Missing audit primary key: ${config.name}`);
    return Object.fromEntries(primary.map((column) => [column.name, row[column.name]]));
  }

  async #fileLinks(row: Row): Promise<Row> {
    const tx = this.#transaction;
    const [photo] = await tx
      .select()
      .from(schema.checklistItemPhotos)
      .where(eq(schema.checklistItemPhotos.fileId, row.id as number));
    const [document] = await tx
      .select()
      .from(schema.projectDocuments)
      .where(eq(schema.projectDocuments.fileId, row.id as number));
    const [invoice] = await tx
      .select()
      .from(schema.materialInvoices)
      .where(eq(schema.materialInvoices.fileId, row.id as number));
    return {
      ...row,
      checklistItemId: photo?.checklistItemId,
      projectId: document?.projectId,
      orderId: invoice?.orderId,
    };
  }

  async #checklistStage(row: Row): Promise<number | null> {
    const tx = this.#transaction;
    const itemId = typeof row.checklistItemId === 'number' ? row.checklistItemId : null;
    let checklistId = typeof row.checklistId === 'number' ? row.checklistId : null;
    if (itemId !== null) {
      const [item] = await tx.select().from(schema.checklistItems).where(eq(schema.checklistItems.id, itemId));
      checklistId = item?.checklistId ?? null;
    }
    if (checklistId !== null) {
      const [checklist] = await tx.select().from(schema.checklists).where(eq(schema.checklists.id, checklistId));
      return checklist?.stageId ?? null;
    }
    return null;
  }

  async #materialStage(row: Row): Promise<number | null> {
    const tx = this.#transaction;
    let orderId = typeof row.orderId === 'number' ? row.orderId : null;
    if (typeof row.invoiceId === 'number') {
      const [invoice] = await tx
        .select()
        .from(schema.materialInvoices)
        .where(eq(schema.materialInvoices.id, row.invoiceId));
      orderId = invoice?.orderId ?? null;
    }
    if (orderId !== null) {
      const [order] = await tx.select().from(schema.materialOrders).where(eq(schema.materialOrders.id, orderId));
      return order?.stageId ?? null;
    }
    return null;
  }

  async #scope(entityType: string, original: Row): Promise<{ projectId: number | null; stageId: number | null }> {
    const row = entityType === 'files' ? await this.#fileLinks(original) : original;
    let stageId = typeof row.stageId === 'number' ? row.stageId : null;
    let projectId = typeof row.projectId === 'number' ? row.projectId : null;
    if (entityType === 'projects') projectId = row.id as number;
    if (entityType === 'stages') stageId = row.id as number;
    if (typeof row.acceptanceId === 'number') {
      const [parent] = await this.#transaction
        .select()
        .from(schema.acceptances)
        .where(eq(schema.acceptances.id, row.acceptanceId));
      stageId = parent?.stageId ?? null;
    }
    stageId = (await this.#checklistStage(row)) ?? (await this.#materialStage(row)) ?? stageId;
    if (stageId !== null) {
      const [stage] = await this.#transaction.select().from(schema.stages).where(eq(schema.stages.id, stageId));
      projectId = stage?.projectId ?? projectId;
    }
    return { projectId, stageId };
  }

  async #record(table: PgTable, before: Row | null, after: Row | null): Promise<void> {
    const entityType = getTableName(table);
    const row = after ?? before!;
    const entityKey = this.#key(table, row);
    const key = `${entityType}:${JSON.stringify(entityKey)}`;
    const previous = this.#changes.get(key);
    let initial = before ? snapshot(entityType, before) : null;
    if (previous) initial = previous.before ?? null;
    const final = after ? snapshot(entityType, after) : null;
    let action: AuditChange['action'] = final === null ? 'delete' : 'update';
    if (initial === null) action = 'create';
    this.#changes.set(key, {
      entityType,
      entityKey,
      ...(await this.#scope(entityType, row)),
      action,
      before: initial,
      after: final,
    });
  }
}

export function auditedTransaction<T>(
  database: Database,
  context: AuditContext,
  operation: string,
  work: (transaction: Transaction, audit: AuditWriter) => Promise<T>,
): Promise<T> {
  return database.transaction(async (transaction) => {
    const audit = new AuditWriter(transaction);
    const result = await work(transaction, audit);
    if (audit.hasEvent) {
      await append(transaction, context, operation, audit.changes);
    }
    return result;
  });
}
