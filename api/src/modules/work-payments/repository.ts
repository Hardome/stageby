import { and, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { projects } from '#app/db/schema/projects';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import { workPayments } from '#app/db/schema/work-payments';
import { workPlanRows } from '#app/db/schema/work-plan-rows';
import type { CreateWorkPayment, UpdateWorkPayment, WorkPayment } from '#app/generated/types.gen';
import type { AuditContext } from '#app/modules/audit/context';
import { auditedTransaction } from '#app/modules/audit/repository';
import { lockProjectStage } from '#app/modules/stages/lock';
import type { Actor } from '#app/modules/stages/types';
import { toWorkPayment } from '#app/modules/work-payments/mapper';
import { preservesPaidInvariant } from '#app/modules/work-payments/paid-invariant';
import type { Database, WorkPaymentOperationError, WorkPaymentOperationResult } from '#app/modules/work-payments/types';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
const recipient = alias(users, 'recipient');

async function loadPayment(database: Database | Transaction, paymentId: number): Promise<WorkPayment | null> {
  const [row] = await database
    .select({
      payment: workPayments,
      createdById: users.id,
      createdByName: users.fullName,
      recipientId: recipient.id,
      recipientName: recipient.fullName,
    })
    .from(workPayments)
    .innerJoin(users, eq(workPayments.createdByUserId, users.id))
    .innerJoin(recipient, eq(workPayments.recipientId, recipient.id))
    .where(eq(workPayments.id, paymentId));
  return row
    ? toWorkPayment(
        row.payment,
        { id: row.createdById, fullName: row.createdByName },
        { id: row.recipientId, fullName: row.recipientName },
      )
    : null;
}

async function validRecipient(transaction: Transaction, id: number): Promise<boolean> {
  const [user] = await transaction
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, 'foreman'), eq(users.isActive, true)))
    .for('share');
  return user !== undefined;
}

const lockStage = lockProjectStage;

async function lockPayment(transaction: Transaction, paymentId: number) {
  const [initial] = await transaction.select().from(workPayments).where(eq(workPayments.id, paymentId));
  if (!initial) return;
  const lockedStage = await lockStage(transaction, initial.stageId);
  if (!lockedStage) return;
  const [row] = await transaction.select().from(workPayments).where(eq(workPayments.id, paymentId)).for('update');
  return row ? { payment: row, ...lockedStage } : undefined;
}

function getMutationError(
  locked: Awaited<ReturnType<typeof lockPayment>>,
  expectedVersion: number,
): WorkPaymentOperationError | null {
  if (!locked) return 'not_found';
  if (locked.isArchived) return 'project_archived';
  if (locked.payment.version !== expectedVersion) return 'version_conflict';
  return null;
}

export class WorkPaymentRepository {
  readonly #database: Database;

  constructor(database: Database) {
    this.#database = database;
  }

  async list(stageId: number, actor: Actor): Promise<WorkPaymentOperationResult<WorkPayment[]>> {
    const [stage] = await this.#database.select().from(stages).where(eq(stages.id, stageId));
    if (!stage || !stage.isIncluded || (actor.role !== 'manager' && stage.assigneeId !== actor.id))
      return { status: 'not_found' };
    const rows = await this.#database
      .select({
        payment: workPayments,
        createdById: users.id,
        createdByName: users.fullName,
        recipientId: recipient.id,
        recipientName: recipient.fullName,
      })
      .from(workPayments)
      .innerJoin(users, eq(workPayments.createdByUserId, users.id))
      .innerJoin(recipient, eq(workPayments.recipientId, recipient.id))
      .where(
        and(
          eq(workPayments.stageId, stageId),
          actor.role === 'manager' ? undefined : eq(workPayments.recipientId, actor.id),
        ),
      )
      .orderBy(desc(workPayments.paidAt), desc(workPayments.id));
    return {
      status: 'ok',
      value: rows.map((row) =>
        toWorkPayment(
          row.payment,
          { id: row.createdById, fullName: row.createdByName },
          { id: row.recipientId, fullName: row.recipientName },
        ),
      ),
    };
  }

  create(
    stageId: number,
    input: CreateWorkPayment,
    createdByUserId: number,
    context: AuditContext = { source: 'system' },
  ): Promise<WorkPaymentOperationResult<WorkPayment>> {
    return auditedTransaction(this.#database, context, 'createWorkPayment', async (transaction, audit) => {
      const locked = await lockStage(transaction, stageId);
      if (!locked) return { status: 'not_found' };
      if (!locked.stage.isIncluded) return { status: 'not_found' };
      if (locked.isArchived) return { status: 'project_archived' };
      const [row] = await transaction
        .select()
        .from(workPlanRows)
        .where(and(eq(workPlanRows.id, input.workPlanRowId), eq(workPlanRows.stageId, stageId)))
        .for('update');
      if (!row) return { status: 'not_found' };
      if (row.recipientId === null || !(await validRecipient(transaction, row.recipientId)))
        return { status: 'invalid_request' };
      const [created] = await audit.created(
        workPayments,
        await transaction
          .insert(workPayments)
          .values({
            stageId,
            workPlanRowId: row.id,
            recipientId: row.recipientId,
            paidAt: input.paidAt,
            amountMinor: input.amountMinor,
            comment: input.comment ?? null,
            createdByUserId,
          })
          .returning(),
      );
      return { status: 'ok', value: (await loadPayment(transaction, created!.id))! };
    });
  }

  update(
    paymentId: number,
    input: UpdateWorkPayment,
    context: AuditContext = { source: 'system' },
  ): Promise<WorkPaymentOperationResult<WorkPayment>> {
    return auditedTransaction(this.#database, context, 'updateWorkPayment', async (transaction, audit) => {
      const locked = await lockPayment(transaction, paymentId);
      const error = getMutationError(locked, input.expectedVersion);
      if (error) return { status: error };
      if (!locked!.stage.isIncluded) return { status: 'not_found' };
      if (
        !(await preservesPaidInvariant(
          transaction,
          locked!.stage,
          (input.amountMinor ?? locked!.payment.amountMinor) - locked!.payment.amountMinor,
        ))
      )
        return { status: 'invalid_transition' };
      if (input.recipientId !== undefined && !(await validRecipient(transaction, input.recipientId)))
        return { status: 'invalid_request' };
      await audit.mutate(
        workPayments,
        and(eq(workPayments.id, paymentId), eq(workPayments.version, input.expectedVersion)),
        () =>
          transaction
            .update(workPayments)
            .set({
              ...(input.recipientId === undefined ? {} : { recipientId: input.recipientId }),
              ...(input.paidAt === undefined ? {} : { paidAt: input.paidAt }),
              ...(input.amountMinor === undefined ? {} : { amountMinor: input.amountMinor }),
              ...(input.comment === undefined ? {} : { comment: input.comment }),
              version: sql`${workPayments.version} + 1`,
              updatedAt: new Date(),
            })
            .where(and(eq(workPayments.id, paymentId), eq(workPayments.version, input.expectedVersion))),
      );
      return { status: 'ok', value: (await loadPayment(transaction, paymentId))! };
    });
  }

  delete(
    paymentId: number,
    expectedVersion: number,
    context: AuditContext = { source: 'system' },
  ): Promise<WorkPaymentOperationResult<void>> {
    return auditedTransaction(this.#database, context, 'deleteWorkPayment', async (transaction, audit) => {
      const locked = await lockPayment(transaction, paymentId);
      const error = getMutationError(locked, expectedVersion);
      if (error) return { status: error };
      if (!locked!.stage.isIncluded) return { status: 'not_found' };
      if (!(await preservesPaidInvariant(transaction, locked!.stage, -locked!.payment.amountMinor)))
        return { status: 'invalid_transition' };
      await audit.mutate(workPayments, eq(workPayments.id, paymentId), () =>
        transaction.delete(workPayments).where(eq(workPayments.id, paymentId)),
      );
      return { status: 'ok', value: undefined };
    });
  }
}
