import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { files } from '#app/db/schema/files';
import { materialInvoices, materialOrders, materialShortages } from '#app/db/schema/materials';
import { projects } from '#app/db/schema/projects';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import type {
  CreateMaterialInvoice,
  MaterialInvoice,
  MaterialOrder,
  MaterialShortage,
  ResolveMaterialShortage,
  UpdateMaterialInvoice,
  UpdateMaterialOrder,
  UserBrief,
} from '#app/generated/types.gen';
import type { AuditContext } from '#app/modules/audit/context';
import { type AuditWriter, auditedTransaction } from '#app/modules/audit/repository';
import type { Actor, Database, MaterialOperationResult } from '#app/modules/materials/types';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type Db = Database | Transaction;
const reporters = alias(users, 'reporter');
const resolvers = alias(users, 'resolver');
const payers = alias(users, 'payer');
const deliverers = alias(users, 'deliverer');

function brief(id: number | null, name: string | null): UserBrief | null {
  return id === null || name === null ? null : { id, fullName: name };
}

function canRead(actor: Actor, assigneeId: number | null): boolean {
  return actor.role === 'manager' || assigneeId === actor.id;
}

async function stageContextByStage(db: Db, stageId: number) {
  const [row] = await db
    .select({ stage: stages, isArchived: projects.isArchived })
    .from(stages)
    .innerJoin(projects, eq(stages.projectId, projects.id))
    .where(eq(stages.id, stageId));
  return row;
}

async function stageContextByOrder(db: Db, orderId: number) {
  const [row] = await db
    .select({ order: materialOrders, stage: stages, isArchived: projects.isArchived })
    .from(materialOrders)
    .innerJoin(stages, eq(materialOrders.stageId, stages.id))
    .innerJoin(projects, eq(stages.projectId, projects.id))
    .where(eq(materialOrders.id, orderId));
  return row;
}

async function stageContextByInvoice(db: Db, invoiceId: number) {
  const [row] = await db
    .select({ invoice: materialInvoices, order: materialOrders, stage: stages, isArchived: projects.isArchived })
    .from(materialInvoices)
    .innerJoin(materialOrders, eq(materialInvoices.orderId, materialOrders.id))
    .innerJoin(stages, eq(materialOrders.stageId, stages.id))
    .innerJoin(projects, eq(stages.projectId, projects.id))
    .where(eq(materialInvoices.id, invoiceId));
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

async function loadInvoices(db: Db, orderIds: number[]): Promise<MaterialInvoice[]> {
  if (orderIds.length === 0) return [];
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
    .where(inArray(materialInvoices.orderId, orderIds))
    .orderBy(asc(materialInvoices.createdAt), asc(materialInvoices.id));
  const shortages = await loadShortages(
    db,
    rows.map(({ invoice }) => invoice.id),
  );
  return rows.map((row) => ({
    id: row.invoice.id,
    orderId: row.invoice.orderId,
    fileId: row.invoice.fileId,
    supplierName: row.invoice.supplierName,
    amountMinor: Number(row.invoice.amountMinor),
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

async function loadOrders(db: Db, stageId: number): Promise<MaterialOrder[]> {
  const rows = await db
    .select({ order: materialOrders, sentById: users.id, sentByName: users.fullName })
    .from(materialOrders)
    .leftJoin(users, eq(materialOrders.sentByUserId, users.id))
    .where(eq(materialOrders.stageId, stageId))
    .orderBy(asc(materialOrders.createdAt), asc(materialOrders.id));
  const invoices = await loadInvoices(
    db,
    rows.map(({ order }) => order.id),
  );
  return rows.map((row) => ({
    id: row.order.id,
    stageId: row.order.stageId,
    sentAt: row.order.sentAt?.toISOString() ?? null,
    sentBy: brief(row.sentById, row.sentByName),
    invoices: invoices.filter((invoice) => invoice.orderId === row.order.id),
    version: row.order.version,
    createdAt: row.order.createdAt.toISOString(),
    updatedAt: row.order.updatedAt.toISOString(),
  }));
}

async function syncSupplyStatus(transaction: Transaction, stageId: number, audit: AuditWriter): Promise<void> {
  const [stage] = await transaction.select().from(stages).where(eq(stages.id, stageId)).for('update');
  if (!stage || !['assigned', 'supplied'].includes(stage.status)) return;
  const orders = await transaction
    .select({ id: materialOrders.id })
    .from(materialOrders)
    .where(eq(materialOrders.stageId, stageId));
  const invoices =
    orders.length > 0
      ? await transaction
          .select({ orderId: materialInvoices.orderId, deliveredAt: materialInvoices.deliveredAt })
          .from(materialInvoices)
          .where(
            inArray(
              materialInvoices.orderId,
              orders.map(({ id }) => id),
            ),
          )
      : [];
  const complete =
    orders.length > 0 &&
    orders.every((order) => {
      const own = invoices.filter((invoice) => invoice.orderId === order.id);
      return own.length > 0 && own.every((invoice) => invoice.deliveredAt !== null);
    });
  const status = complete ? 'supplied' : 'assigned';
  if (status !== stage.status) {
    await audit.mutate(stages, eq(stages.id, stageId), () =>
      transaction
        .update(stages)
        .set({ status, version: sql`${stages.version} + 1`, updatedAt: new Date() })
        .where(eq(stages.id, stageId)),
    );
  }
}

function invoiceStateUpdate(
  invoice: typeof materialInvoices.$inferSelect,
  input: UpdateMaterialInvoice,
  actor: Actor,
  now: Date,
) {
  const paid =
    input.isPaid === undefined
      ? {}
      : {
          paidAt: input.isPaid ? (invoice.paidAt ?? now) : null,
          paidByUserId: input.isPaid ? (invoice.paidByUserId ?? actor.id) : null,
        };
  const delivered =
    input.isDelivered === undefined
      ? {}
      : {
          deliveredAt: input.isDelivered ? (invoice.deliveredAt ?? now) : null,
          deliveredByUserId: input.isDelivered ? (invoice.deliveredByUserId ?? actor.id) : null,
        };
  return { ...paid, ...delivered, version: sql`${materialInvoices.version} + 1`, updatedAt: now };
}

export class MaterialRepository {
  private readonly database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  async listOrders(stageId: number, actor: Actor): Promise<MaterialOperationResult<MaterialOrder[]>> {
    const context = await stageContextByStage(this.database, stageId);
    if (!context || !canRead(actor, context.stage.assigneeId)) return { status: 'not_found' };
    return { status: 'ok', value: await loadOrders(this.database, stageId) };
  }

  createOrder(
    stageId: number,
    actor: Actor,
    context: AuditContext = { source: 'system' },
  ): Promise<MaterialOperationResult<MaterialOrder>> {
    return auditedTransaction(this.database, context, 'createMaterialOrder', async (transaction, audit) => {
      const context = await stageContextByStage(transaction, stageId);
      if (!context) return { status: 'not_found' };
      if (context.isArchived) return { status: 'project_archived' };
      const [order] = await audit.created(
        materialOrders,
        await transaction.insert(materialOrders).values({ stageId }).returning(),
      );
      await syncSupplyStatus(transaction, stageId, audit);
      const orders = await loadOrders(transaction, stageId);
      return { status: 'ok', value: orders.find(({ id }) => id === order!.id)! };
    });
  }

  updateOrder(
    orderId: number,
    input: UpdateMaterialOrder,
    actor: Actor,
    context: AuditContext = { source: 'system' },
  ): Promise<MaterialOperationResult<MaterialOrder>> {
    return auditedTransaction(this.database, context, 'updateMaterialOrder', async (transaction, audit) => {
      const [order] = await transaction
        .select()
        .from(materialOrders)
        .where(eq(materialOrders.id, orderId))
        .for('update');
      if (!order) return { status: 'not_found' };
      const context = await stageContextByOrder(transaction, orderId);
      if (!context) return { status: 'not_found' };
      if (context.isArchived) return { status: 'project_archived' };
      if (order.version !== input.expectedVersion) return { status: 'version_conflict' };
      const now = new Date();
      await audit.mutate(materialOrders, eq(materialOrders.id, orderId), () =>
        transaction
          .update(materialOrders)
          .set({
            sentAt: input.isSent ? (order.sentAt ?? now) : null,
            sentByUserId: input.isSent ? (order.sentByUserId ?? actor.id) : null,
            version: sql`${materialOrders.version} + 1`,
            updatedAt: now,
          })
          .where(eq(materialOrders.id, orderId)),
      );
      const orders = await loadOrders(transaction, order.stageId);
      return { status: 'ok', value: orders.find(({ id }) => id === orderId)! };
    });
  }

  async listInvoices(orderId: number, actor: Actor): Promise<MaterialOperationResult<MaterialInvoice[]>> {
    const context = await stageContextByOrder(this.database, orderId);
    if (!context || !canRead(actor, context.stage.assigneeId)) return { status: 'not_found' };
    return { status: 'ok', value: await loadInvoices(this.database, [orderId]) };
  }

  createInvoice(
    orderId: number,
    input: CreateMaterialInvoice,
    context: AuditContext = { source: 'system' },
  ): Promise<MaterialOperationResult<MaterialInvoice>> {
    return auditedTransaction(this.database, context, 'createMaterialInvoice', async (transaction, audit) => {
      const context = await stageContextByOrder(transaction, orderId);
      if (!context) return { status: 'not_found' };
      if (context.isArchived) return { status: 'project_archived' };
      const [file] = await transaction.select().from(files).where(eq(files.id, input.fileId)).for('update');
      if (!file || file.status !== 'uploaded' || file.purpose !== 'material_invoice')
        return { status: 'invalid_request' };
      if (file.mimeType !== 'application/pdf' && file.mimeType !== 'image/jpeg') return { status: 'invalid_request' };
      const [used] = await transaction
        .select({ id: materialInvoices.id })
        .from(materialInvoices)
        .where(eq(materialInvoices.fileId, input.fileId));
      if (used) return { status: 'invalid_request' };
      const [invoice] = await audit.created(
        materialInvoices,
        await transaction
          .insert(materialInvoices)
          .values({
            orderId,
            fileId: input.fileId,
            amountMinor: input.amountMinor,
            supplierName: input.supplierName ?? null,
          })
          .returning(),
      );
      await syncSupplyStatus(transaction, context.stage.id, audit);
      const invoices = await loadInvoices(transaction, [orderId]);
      return { status: 'ok', value: invoices.find(({ id }) => id === invoice!.id)! };
    });
  }

  updateInvoice(
    invoiceId: number,
    input: UpdateMaterialInvoice,
    actor: Actor,
    context: AuditContext = { source: 'system' },
  ): Promise<MaterialOperationResult<MaterialInvoice>> {
    return auditedTransaction(this.database, context, 'updateMaterialInvoice', async (transaction, audit) => {
      const [invoice] = await transaction
        .select()
        .from(materialInvoices)
        .where(eq(materialInvoices.id, invoiceId))
        .for('update');
      const context = await stageContextByInvoice(transaction, invoiceId);
      if (!invoice || !context || !canRead(actor, context.stage.assigneeId)) return { status: 'not_found' };
      if (context.isArchived) return { status: 'project_archived' };
      if (invoice.version !== input.expectedVersion) return { status: 'version_conflict' };
      if (actor.role === 'foreman' && input.isPaid !== undefined) return { status: 'forbidden' };
      const now = new Date();
      await audit.mutate(materialInvoices, eq(materialInvoices.id, invoiceId), () =>
        transaction
          .update(materialInvoices)
          .set(invoiceStateUpdate(invoice, input, actor, now))
          .where(eq(materialInvoices.id, invoiceId)),
      );
      await syncSupplyStatus(transaction, context.stage.id, audit);
      const invoices = await loadInvoices(transaction, [invoice.orderId]);
      return { status: 'ok', value: invoices.find(({ id }) => id === invoiceId)! };
    });
  }

  createShortage(
    invoiceId: number,
    comment: string,
    actor: Actor,
    context: AuditContext = { source: 'system' },
  ): Promise<MaterialOperationResult<MaterialShortage>> {
    return auditedTransaction(this.database, context, 'createMaterialShortage', async (transaction, audit) => {
      const context = await stageContextByInvoice(transaction, invoiceId);
      if (!context || !canRead(actor, context.stage.assigneeId)) return { status: 'not_found' };
      if (context.isArchived) return { status: 'project_archived' };
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
      const [shortage] = await transaction
        .select()
        .from(materialShortages)
        .where(eq(materialShortages.id, shortageId))
        .for('update');
      if (!shortage) return { status: 'not_found' };
      const context = await stageContextByInvoice(transaction, shortage.invoiceId);
      if (!context) return { status: 'not_found' };
      if (context.isArchived) return { status: 'project_archived' };
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
