import { and, asc, eq, sql } from 'drizzle-orm';

import { projects } from '#app/db/schema/projects';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import { workPayments } from '#app/db/schema/work-payments';
import { workPlanRows } from '#app/db/schema/work-plan-rows';
import type {
  CreateWorkPlanRow,
  DistributeWorkPlanRow,
  UpdateWorkPlanRow,
  WorkPlanRow,
} from '#app/generated/types.gen';
import type { AuditContext } from '#app/modules/audit/context';
import { type AuditWriter, auditedTransaction } from '#app/modules/audit/repository';
import { lockProjectStage } from '#app/modules/stages/lock';
import type { Actor, Database } from '#app/modules/stages/types';

type Db = Database | Parameters<Parameters<Database['transaction']>[0]>[0];
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type Row = typeof workPlanRows.$inferSelect;
type Result<T> =
  | { status: 'ok'; value: T }
  | { status: 'not_found' | 'version_conflict' | 'project_archived' | 'invalid_request' | 'invalid_transition' };

function map(row: typeof workPlanRows.$inferSelect): WorkPlanRow {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

async function context(db: Db, stageId: number, lock = false) {
  if (lock) return lockProjectStage(db as Transaction, stageId);
  const query = db
    .select({ stage: stages, isArchived: projects.isArchived })
    .from(stages)
    .innerJoin(projects, eq(stages.projectId, projects.id))
    .where(eq(stages.id, stageId));
  const [row] = await query;
  return row;
}

async function recipientValid(db: Db, recipientId: number | null | undefined): Promise<boolean> {
  if (recipientId == null) return true;
  const [recipient] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, recipientId), eq(users.role, 'foreman'), eq(users.isActive, true)))
    .for('share');
  return recipient !== undefined;
}

async function lockRow(tx: Transaction, rowId: number, expectedVersion: number): Promise<Result<Row>> {
  const [initial] = await tx.select().from(workPlanRows).where(eq(workPlanRows.id, rowId));
  if (!initial) return { status: 'not_found' };
  const found = await context(tx, initial.stageId, true);
  if (!found || !found.stage.isIncluded) return { status: 'not_found' };
  if (found.isArchived) return { status: 'project_archived' };
  const [row] = await tx.select().from(workPlanRows).where(eq(workPlanRows.id, rowId)).for('update');
  if (!row) return { status: 'not_found' };
  if (row.version !== expectedVersion) return { status: 'version_conflict' };
  return { status: 'ok', value: row };
}

async function distributeRow(
  tx: Transaction,
  audit: AuditWriter,
  row: Row,
  input: DistributeWorkPlanRow,
): Promise<Result<WorkPlanRow[]>> {
  if (
    row.recipientId !== null ||
    input.rows.length < 2 ||
    input.rows.reduce((total, item) => total + BigInt(item.amountMinor), 0n) !== BigInt(row.amountMinor)
  )
    return { status: 'invalid_request' };
  for (const item of input.rows)
    if (!(await recipientValid(tx, item.recipientId))) return { status: 'invalid_request' };
  const created = await audit.created(
    workPlanRows,
    await tx
      .insert(workPlanRows)
      .values(
        input.rows.map((item) => ({
          stageId: row.stageId,
          amountMinor: item.amountMinor,
          recipientId: item.recipientId ?? null,
          dueDate: item.dueDate ?? null,
        })),
      )
      .returning(),
  );
  await deleteRow(tx, audit, row.id);
  return { status: 'ok', value: created.map(map) };
}

async function deleteRow(tx: Transaction, audit: AuditWriter, rowId: number): Promise<Result<undefined>> {
  await audit.mutate(workPlanRows, eq(workPlanRows.id, rowId), () =>
    tx.delete(workPlanRows).where(eq(workPlanRows.id, rowId)),
  );
  return { status: 'ok', value: undefined };
}

async function updateRow(
  tx: Transaction,
  audit: AuditWriter,
  rowId: number,
  input: UpdateWorkPlanRow,
): Promise<Result<WorkPlanRow>> {
  if (!(await recipientValid(tx, input.recipientId))) return { status: 'invalid_request' };
  const { expectedVersion: _version, ...fields } = input;
  const [updated] = await audit.mutate(workPlanRows, eq(workPlanRows.id, rowId), () =>
    tx
      .update(workPlanRows)
      .set({ ...fields, version: sql`${workPlanRows.version} + 1`, updatedAt: new Date() })
      .where(eq(workPlanRows.id, rowId))
      .returning(),
  );
  return { status: 'ok', value: map(updated!) };
}

export class WorkPlanRowRepository {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async list(stageId: number, actor: Actor): Promise<Result<WorkPlanRow[]>> {
    const found = await context(this.database, stageId);
    if (!found || !found.stage.isIncluded || (actor.role !== 'manager' && found.stage.assigneeId !== actor.id))
      return { status: 'not_found' };
    const rows = await this.database
      .select()
      .from(workPlanRows)
      .where(
        and(
          eq(workPlanRows.stageId, stageId),
          actor.role === 'manager' ? undefined : eq(workPlanRows.recipientId, actor.id),
        ),
      )
      .orderBy(asc(workPlanRows.id));
    return { status: 'ok', value: rows.map(map) };
  }

  async get(rowId: number, actor: Actor): Promise<Result<WorkPlanRow>> {
    const [row] = await this.database.select().from(workPlanRows).where(eq(workPlanRows.id, rowId));
    if (!row) return { status: 'not_found' };
    const result = await this.list(row.stageId, actor);
    if (result.status !== 'ok') return result;
    const visible = result.value.find((candidate) => candidate.id === rowId);
    return visible ? { status: 'ok', value: visible } : { status: 'not_found' };
  }

  create(stageId: number, input: CreateWorkPlanRow, auditContext: AuditContext): Promise<Result<WorkPlanRow>> {
    return auditedTransaction(this.database, auditContext, 'createWorkPlanRow', async (tx, audit) => {
      const found = await context(tx, stageId, true);
      if (!found || !found.stage.isIncluded) return { status: 'not_found' };
      if (found.isArchived) return { status: 'project_archived' };
      if (!(await recipientValid(tx, input.recipientId))) return { status: 'invalid_request' };
      const [created] = await audit.created(
        workPlanRows,
        await tx
          .insert(workPlanRows)
          .values({
            stageId,
            amountMinor: input.amountMinor,
            recipientId: input.recipientId ?? null,
            dueDate: input.dueDate ?? null,
          })
          .returning(),
      );
      return { status: 'ok', value: map(created!) };
    });
  }

  mutate(
    rowId: number,
    input: UpdateWorkPlanRow | DistributeWorkPlanRow | { expectedVersion: number },
    operation: 'updateWorkPlanRow' | 'deleteWorkPlanRow' | 'distributeWorkPlanRow',
    auditContext: AuditContext,
  ): Promise<Result<WorkPlanRow | WorkPlanRow[] | undefined>> {
    return auditedTransaction(this.database, auditContext, operation, async (tx, audit) => {
      const locked = await lockRow(tx, rowId, input.expectedVersion);
      if (locked.status !== 'ok') return locked;
      const row = locked.value;
      const [payment] = await tx
        .select({ id: workPayments.id })
        .from(workPayments)
        .where(eq(workPayments.workPlanRowId, rowId))
        .limit(1);
      if (operation !== 'updateWorkPlanRow' && payment) return { status: 'invalid_transition' };
      if (operation === 'distributeWorkPlanRow') return distributeRow(tx, audit, row, input as DistributeWorkPlanRow);
      if (operation === 'deleteWorkPlanRow') return deleteRow(tx, audit, rowId);
      return updateRow(tx, audit, rowId, input as UpdateWorkPlanRow);
    });
  }
}
