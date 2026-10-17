import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { files } from '#app/db/schema/files';
import { materialInvoices, materialShortages } from '#app/db/schema/materials';
import { projects } from '#app/db/schema/projects';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import type {
  CreateMaterialInvoice,
  MaterialShortage,
  ResolveMaterialShortage,
  StageMaterialInvoice,
  UpdateMaterialInvoice,
  UserBrief,
} from '#app/generated/types.gen';
import type { AuditContext } from '#app/modules/audit/context';
import { type AuditWriter, auditedTransaction } from '#app/modules/audit/repository';
import { getMaximumSize } from '#app/modules/files/policy';
import { isSupplyComplete, loadStageSummaries } from '#app/modules/materials/summary';
import type { Actor, Database, MaterialOperationError, MaterialOperationResult } from '#app/modules/materials/types';
import { lockProjectStage } from '#app/modules/stages/lock';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type Db = Database | Transaction;
const reporters = alias(users, 'reporter');
const resolvers = alias(users, 'resolver');
const payers = alias(users, 'payer');
const deliverers = alias(users, 'deliverer');
const maximumInvoicesPerStage = 10;

function isSameInvoice(existing: typeof materialInvoices.$inferSelect, stageId: number, input: CreateMaterialInvoice) {
  return (
    existing.stageId === stageId &&
    existing.amountMinor === input.amountMinor &&
    existing.supplierName === (input.supplierName ?? null)
  );
}

function brief(id: number | null, name: string | null): UserBrief | null {
  return id === null || name === null ? null : { id, fullName: name };
}

function canRead(actor: Actor, assigneeId: number | null): boolean {
  return actor.role === 'manager' || assigneeId === actor.id;
}

async function stageContextByStage(db: Db, stageId: number, lock = false) {
  if (lock) return lockProjectStage(db as Transaction, stageId);
  const [row] = await db
    .select({ stage: stages, isArchived: projects.isArchived })
    .from(stages)
    .innerJoin(projects, eq(stages.projectId, projects.id))
    .where(eq(stages.id, stageId));
  return row;
}

async function stageContextByInvoice(db: Db, invoiceId: number, lock = false) {
  const [row] = await db
    .select({ invoice: materialInvoices, stage: stages, isArchived: projects.isArchived })
    .from(materialInvoices)
    .innerJoin(stages, eq(materialInvoices.stageId, stages.id))
    .innerJoin(projects, eq(stages.projectId, projects.id))
    .where(eq(materialInvoices.id, invoiceId));
  if (lock && row) {
    const locked = await lockProjectStage(db as Transaction, row.stage.id);
    return locked ? { invoice: row.invoice, ...locked } : undefined;
  }
  return row;
}

async function loadShortages(db: Db, invoiceIds: number[]): Promise<Map<number, MaterialShortage[]>> {
  const result = new Map<number, MaterialShortage[]>();
  if (invoiceIds.length === 0) return result;
  const rows = await db
    .select({
      shortage: materialShortages,
      reporterId: reporters.id,
      reporterName: reporters.fullName,
      resolverId: resolvers.id,
      resolverName: resolvers.fullName,
    })
    .from(materialShortages)
    .innerJoin(reporters, eq(materialShortages.reportedByUserId, reporters.id))
    .leftJoin(resolvers, eq(materialShortages.resolvedByUserId, resolvers.id))
    .where(inArray(materialShortages.invoiceId, invoiceIds))
    .orderBy(asc(materialShortages.reportedAt), asc(materialShortages.id));
  for (const row of rows) {
    const value: MaterialShortage = {
      id: row.shortage.id,
      invoiceId: row.shortage.invoiceId,
      comment: row.shortage.comment,
      reportedAt: row.shortage.reportedAt.toISOString(),
      reportedBy: { id: row.reporterId, fullName: row.reporterName },
      resolvedAt: row.shortage.resolvedAt?.toISOString() ?? null,
      resolvedBy: brief(row.resolverId, row.resolverName),
      resolutionComment: row.shortage.resolutionComment,
      version: row.shortage.version,
    };
    result.set(value.invoiceId, [...(result.get(value.invoiceId) ?? []), value]);
  }
  return result;
}

async function loadInvoices(db: Db, stageId: number): Promise<StageMaterialInvoice[]> {
  const rows = await db
    .select({
      invoice: materialInvoices,
      paidById: payers.id,
      paidByName: payers.fullName,
      deliveredById: deliverers.id,
      deliveredByName: deliverers.fullName,
    })
    .from(materialInvoices)
    .leftJoin(payers, eq(materialInvoices.paidByUserId, payers.id))
    .leftJoin(deliverers, eq(materialInvoices.deliveredByUserId, deliverers.id))
    .where(eq(materialInvoices.stageId, stageId))
    .orderBy(asc(materialInvoices.createdAt), asc(materialInvoices.id));
  const shortages = await loadShortages(
    db,
    rows.map(({ invoice }) => invoice.id),
  );
  return rows.map((row) => ({
    id: row.invoice.id,
    stageId: row.invoice.stageId,
    fileId: row.invoice.fileId,
    supplierName: row.invoice.supplierName,
    amountMinor: Number(row.invoice.amountMinor),
    paidAmountMinor: row.invoice.paidAmountMinor,
    paidDate: row.invoice.paidDate,
    paidAt: row.invoice.paidAt?.toISOString() ?? null,
    paidBy: brief(row.paidById, row.paidByName),
    deliveredAt: row.invoice.deliveredAt?.toISOString() ?? null,
    deliveredBy: brief(row.deliveredById, row.deliveredByName),
    shortages: shortages.get(row.invoice.id) ?? [],
    version: row.invoice.version,
    createdAt: row.invoice.createdAt.toISOString(),
    updatedAt: row.invoice.updatedAt.toISOString(),
  }));
}

async function syncSupplyStatus(transaction: Transaction, stageId: number, audit: AuditWriter): Promise<void> {
  const [stage] = await transaction.select().from(stages).where(eq(stages.id, stageId)).for('update');
  if (!stage || !['assigned', 'supplied'].includes(stage.status)) return;
  const summary = (await loadStageSummaries(transaction, [stageId])).get(stageId)!;
  const status = isSupplyComplete(summary.materialSummary) ? 'supplied' : 'assigned';
  if (status !== stage.status) {
    await audit.mutate(stages, eq(stages.id, stageId), () =>
      transaction
        .update(stages)
        .set({ status, version: sql`${stages.version} + 1`, updatedAt: new Date() })
        .where(eq(stages.id, stageId)),
    );
  }
}

function invoicePaidUpdate(
  invoice: typeof materialInvoices.$inferSelect,
  input: UpdateMaterialInvoice,
  actor: Actor,
  now: Date,
) {
  if (input.isPaid === undefined) return {};
  return {
    paidAt: input.isPaid ? (invoice.paidAt ?? now) : null,
    paidByUserId: input.isPaid ? (invoice.paidByUserId ?? actor.id) : null,
    paidAmountMinor: input.isPaid ? input.paidAmountMinor! : null,
    paidDate: input.isPaid ? input.paidDate! : null,
  };
}

function invoiceStateUpdate(
  invoice: typeof materialInvoices.$inferSelect,
  input: UpdateMaterialInvoice,
  actor: Actor,
  now: Date,
) {
  const paid = invoicePaidUpdate(invoice, input, actor, now);
  const delivered =
    input.isDelivered === undefined
      ? {}
      : {
          deliveredAt: input.isDelivered ? (invoice.deliveredAt ?? now) : null,
          deliveredByUserId: input.isDelivered ? (invoice.deliveredByUserId ?? actor.id) : null,
        };
  return {
    ...paid,
    ...delivered,
    ...(input.amountMinor === undefined ? {} : { amountMinor: input.amountMinor }),
    ...(input.supplierName === undefined ? {} : { supplierName: input.supplierName }),
    ...(input.fileId === undefined ? {} : { fileId: input.fileId }),
    version: sql`${materialInvoices.version} + 1`,
    updatedAt: now,
  };
}

function invoicePaymentError(input: UpdateMaterialInvoice, actor: Actor): MaterialOperationError | null {
  if (
    actor.role !== 'manager' &&
    (input.amountMinor !== undefined || input.supplierName !== undefined || input.fileId !== undefined)
  )
    return 'forbidden';
  const hasPaymentFields = input.paidAmountMinor !== undefined || input.paidDate !== undefined;
  if (actor.role === 'foreman' && (input.isPaid !== undefined || hasPaymentFields)) return 'forbidden';
  if (input.isPaid === true && (input.paidAmountMinor === undefined || input.paidDate === undefined))
    return 'invalid_request';
  if (input.isPaid !== true && hasPaymentFields) return 'invalid_request';
  return null;
}

async function getInvoiceFileError(transaction: Transaction, fileId: number): Promise<MaterialOperationError | null> {
  const [file] = await transaction.select().from(files).where(eq(files.id, fileId)).for('update');
  if (!file || file.status !== 'uploaded' || file.purpose !== 'material_invoice') return 'invalid_request';
  if (file.sizeBytes > getMaximumSize('material_invoice')) return 'file_too_large';
  if (file.mimeType !== 'application/pdf' && file.mimeType !== 'image/jpeg') return 'invalid_request';
  const [used] = await transaction
    .select({ id: materialInvoices.id })
    .from(materialInvoices)
    .where(eq(materialInvoices.fileId, fileId));
  return used ? 'invalid_request' : null;
}

async function getReplacementFileError(transaction: Transaction, currentFileId: number, fileId?: number) {
  if (fileId === undefined || fileId === currentFileId) return null;
  return getInvoiceFileError(transaction, fileId);
}

export class MaterialRepository {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async listInvoices(stageId: number, actor: Actor): Promise<MaterialOperationResult<StageMaterialInvoice[]>> {
    const context = await stageContextByStage(this.database, stageId);
    if (!context || !canRead(actor, context.stage.assigneeId)) return { status: 'not_found' };
    return { status: 'ok', value: await loadInvoices(this.database, stageId) };
  }

  createInvoice(
    stageId: number,
    input: CreateMaterialInvoice,
    context: AuditContext = { source: 'system' },
  ): Promise<MaterialOperationResult<StageMaterialInvoice>> {
    return auditedTransaction(this.database, context, 'createMaterialInvoice', async (transaction, audit) => {
      const stageContext = await stageContextByStage(transaction, stageId, true);
      if (!stageContext || !stageContext.stage.isIncluded) return { status: 'not_found' };
      if (stageContext.isArchived) return { status: 'project_archived' };
      // Lock the file before checking its unique attachment, including retries on another stage.
      await transaction.select({ id: files.id }).from(files).where(eq(files.id, input.fileId)).for('update');
      const [existing] = await transaction
        .select()
        .from(materialInvoices)
        .where(eq(materialInvoices.fileId, input.fileId));
      if (existing) {
        if (!isSameInvoice(existing, stageId, input)) return { status: 'invalid_request' };
        return {
          status: 'ok',
          value: (await loadInvoices(transaction, stageId)).find(({ id }) => id === existing.id)!,
        };
      }
      const [invoiceCount] = await transaction
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(materialInvoices)
        .where(eq(materialInvoices.stageId, stageId));
      if (invoiceCount!.count >= maximumInvoicesPerStage) return { status: 'invoice_limit_exceeded' };
      const fileError = await getInvoiceFileError(transaction, input.fileId);
      if (fileError) return { status: fileError };
      const [invoice] = await audit.created(
        materialInvoices,
        await transaction
          .insert(materialInvoices)
          .values({
            stageId,
            fileId: input.fileId,
            amountMinor: input.amountMinor,
            supplierName: input.supplierName ?? null,
          })
          .returning(),
      );
      await syncSupplyStatus(transaction, stageId, audit);
      const invoices = await loadInvoices(transaction, stageId);
      return { status: 'ok', value: invoices.find(({ id }) => id === invoice!.id)! };
    });
  }

  updateInvoice(
    invoiceId: number,
    input: UpdateMaterialInvoice,
    actor: Actor,
    context: AuditContext = { source: 'system' },
  ): Promise<MaterialOperationResult<StageMaterialInvoice>> {
    return auditedTransaction(this.database, context, 'updateMaterialInvoice', async (transaction, audit) => {
      const stageContext = await stageContextByInvoice(transaction, invoiceId, true);
      const [invoice] = await transaction
        .select()
        .from(materialInvoices)
        .where(eq(materialInvoices.id, invoiceId))
        .for('update');
      if (!invoice || !stageContext || !canRead(actor, stageContext.stage.assigneeId)) return { status: 'not_found' };
      if (!stageContext.stage.isIncluded) return { status: 'not_found' };
      if (stageContext.isArchived) return { status: 'project_archived' };
      if (invoice.version !== input.expectedVersion) return { status: 'version_conflict' };
      const paymentError = invoicePaymentError(input, actor);
      if (paymentError) return { status: paymentError };
      const fileError = await getReplacementFileError(transaction, invoice.fileId, input.fileId);
      if (fileError) return { status: fileError };
      await audit.mutate(materialInvoices, eq(materialInvoices.id, invoiceId), () =>
        transaction
          .update(materialInvoices)
          .set(invoiceStateUpdate(invoice, input, actor, new Date()))
          .where(eq(materialInvoices.id, invoiceId)),
      );
      await syncSupplyStatus(transaction, stageContext.stage.id, audit);
      const invoices = await loadInvoices(transaction, invoice.stageId);
      return { status: 'ok', value: invoices.find(({ id }) => id === invoiceId)! };
    });
  }

  deleteInvoice(
    invoiceId: number,
    expectedVersion: number,
    actor: Actor,
    context: AuditContext = { source: 'system' },
  ): Promise<MaterialOperationResult<undefined>> {
    if (actor.role !== 'manager') return Promise.resolve({ status: 'forbidden' });
    return auditedTransaction(this.database, context, 'deleteMaterialInvoice', async (transaction, audit) => {
      const stageContext = await stageContextByInvoice(transaction, invoiceId, true);
      const [invoice] = await transaction
        .select()
        .from(materialInvoices)
        .where(eq(materialInvoices.id, invoiceId))
        .for('update');
      if (!invoice || !stageContext || !stageContext.stage.isIncluded) return { status: 'not_found' };
      if (stageContext.isArchived) return { status: 'project_archived' };
      if (invoice.version !== expectedVersion) return { status: 'version_conflict' };
      await audit.mutate(materialShortages, eq(materialShortages.invoiceId, invoiceId), () =>
        transaction.delete(materialShortages).where(eq(materialShortages.invoiceId, invoiceId)),
      );
      await audit.mutate(materialInvoices, eq(materialInvoices.id, invoiceId), () =>
        transaction.delete(materialInvoices).where(eq(materialInvoices.id, invoiceId)),
      );
      await syncSupplyStatus(transaction, invoice.stageId, audit);
      return { status: 'ok', value: undefined };
    });
  }

  createShortage(
    invoiceId: number,
    comment: string,
    actor: Actor,
    context: AuditContext = { source: 'system' },
  ): Promise<MaterialOperationResult<MaterialShortage>> {
    return auditedTransaction(this.database, context, 'createMaterialShortage', async (transaction, audit) => {
      const stageContext = await stageContextByInvoice(transaction, invoiceId, true);
      if (!stageContext || !canRead(actor, stageContext.stage.assigneeId)) return { status: 'not_found' };
      if (!stageContext.stage.isIncluded) return { status: 'not_found' };
      if (stageContext.isArchived) return { status: 'project_archived' };
      const [shortage] = await audit.created(
        materialShortages,
        await transaction
          .insert(materialShortages)
          .values({ invoiceId, comment, reportedByUserId: actor.id })
          .returning(),
      );
      const values = await loadShortages(transaction, [invoiceId]);
      return { status: 'ok', value: values.get(invoiceId)!.find(({ id }) => id === shortage!.id)! };
    });
  }

  resolveShortage(
    shortageId: number,
    input: ResolveMaterialShortage,
    actor: Actor,
    context: AuditContext = { source: 'system' },
  ): Promise<MaterialOperationResult<MaterialShortage>> {
    return auditedTransaction(this.database, context, 'resolveMaterialShortage', async (transaction, audit) => {
      const [initial] = await transaction.select().from(materialShortages).where(eq(materialShortages.id, shortageId));
      if (!initial) return { status: 'not_found' };
      const stageContext = await stageContextByInvoice(transaction, initial.invoiceId, true);
      const [shortage] = await transaction
        .select()
        .from(materialShortages)
        .where(eq(materialShortages.id, shortageId))
        .for('update');
      if (!shortage) return { status: 'not_found' };
      if (!stageContext) return { status: 'not_found' };
      if (!stageContext.stage.isIncluded) return { status: 'not_found' };
      if (stageContext.isArchived) return { status: 'project_archived' };
      if (shortage.version !== input.expectedVersion) return { status: 'version_conflict' };
      if (shortage.resolvedAt !== null) return { status: 'invalid_transition' };
      await audit.mutate(
        materialShortages,
        and(eq(materialShortages.id, shortageId), isNull(materialShortages.resolvedAt)),
        () =>
          transaction
            .update(materialShortages)
            .set({
              resolvedAt: new Date(),
              resolvedByUserId: actor.id,
              resolutionComment: input.resolutionComment ?? null,
              version: sql`${materialShortages.version} + 1`,
            })
            .where(and(eq(materialShortages.id, shortageId), isNull(materialShortages.resolvedAt))),
      );
      const values = await loadShortages(transaction, [shortage.invoiceId]);
      return { status: 'ok', value: values.get(shortage.invoiceId)!.find(({ id }) => id === shortageId)! };
    });
  }
}
