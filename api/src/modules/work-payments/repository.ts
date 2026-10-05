import { and, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { projects } from '#app/db/schema/projects';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import { workPayments } from '#app/db/schema/work-payments';
import type { CreateWorkPayment, UpdateWorkPayment, WorkPayment } from '#app/generated/types.gen';
import type { AuditContext } from '#app/modules/audit/context';
import { auditedTransaction } from '#app/modules/audit/repository';
import { toWorkPayment } from '#app/modules/work-payments/mapper';
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

async function lockStage(transaction: Transaction, stageId: number) {
  const [row] = await transaction
    .select({ stageId: stages.id, isArchived: projects.isArchived })
    .from(stages)
    .innerJoin(projects, eq(stages.projectId, projects.id))
    .where(eq(stages.id, stageId))
    .for('update');
  return row;
}

async function lockPayment(transaction: Transaction, paymentId: number) {
  const [row] = await transaction
    .select({ payment: workPayments, isArchived: projects.isArchived })
    .from(workPayments)
    .innerJoin(stages, eq(workPayments.stageId, stages.id))
    .innerJoin(projects, eq(stages.projectId, projects.id))
    .where(eq(workPayments.id, paymentId))
    .for('update');
  return row;
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

  async list(stageId: number): Promise<WorkPaymentOperationResult<WorkPayment[]>> {
    const [stage] = await this.#database.select({ id: stages.id }).from(stages).where(eq(stages.id, stageId));
    if (!stage) return { status: 'not_found' };
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
      .where(eq(workPayments.stageId, stageId))
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
      if (locked.isArchived) return { status: 'project_archived' };
      if (!(await validRecipient(transaction, input.recipientId))) return { status: 'invalid_request' };
      const [created] = await audit.created(
        workPayments,
        await transaction
          .insert(workPayments)
          .values({
            stageId,
            recipientId: input.recipientId,
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
      await audit.mutate(workPayments, eq(workPayments.id, paymentId), () =>
        transaction.delete(workPayments).where(eq(workPayments.id, paymentId)),
      );
      return { status: 'ok', value: undefined };
    });
  }
}
