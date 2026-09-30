import { and, asc, desc, eq, inArray, sql, sum } from 'drizzle-orm';

import { acceptanceItems, acceptances } from '#app/db/schema/acceptances';
import { type ChecklistItemRow, type ChecklistRow, checklistItems, checklists } from '#app/db/schema/checklists';
import { checklistItemPhotos, files } from '#app/db/schema/files';
import { materialInvoices, materialOrders } from '#app/db/schema/materials';
import { projects } from '#app/db/schema/projects';
import { stageTypes } from '#app/db/schema/stage-types';
import { stagePredecessors, stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import { workPayments } from '#app/db/schema/work-payments';
import type { Checklist, RejectStage, Stage, UpdateChecklistItem } from '#app/generated/types.gen';
import type { Actor, Database, OperationResult, StageOperationError } from '#app/modules/stages/types';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

function today(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Yekaterinburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function canRead(actor: Actor, assigneeId: number | null): boolean {
  return actor.role === 'manager' || (actor.role === 'foreman' && assigneeId === actor.id);
}

async function isMaterialSupplyComplete(database: Database | Transaction, stageId: number): Promise<boolean> {
  const orders = await database
    .select({ id: materialOrders.id })
    .from(materialOrders)
    .where(eq(materialOrders.stageId, stageId));
  if (orders.length === 0) return false;
  const invoices = await database
    .select({ orderId: materialInvoices.orderId, deliveredAt: materialInvoices.deliveredAt })
    .from(materialInvoices)
    .where(
      inArray(
        materialInvoices.orderId,
        orders.map(({ id }) => id),
      ),
    );
  return orders.every((order) => {
    const orderInvoices = invoices.filter((invoice) => invoice.orderId === order.id);
    return orderInvoices.length > 0 && orderInvoices.every((invoice) => invoice.deliveredAt !== null);
  });
}

async function loadChecklist(database: Database | Transaction, stageId: number): Promise<Checklist | null> {
  const [row] = await database.select().from(checklists).where(eq(checklists.stageId, stageId));
  if (!row) return null;
  const items = await database
    .select({ item: checklistItems, completedById: users.id, completedByName: users.fullName })
    .from(checklistItems)
    .leftJoin(users, eq(checklistItems.completedByUserId, users.id))
    .where(eq(checklistItems.checklistId, row.id))
    .orderBy(asc(checklistItems.position), asc(checklistItems.id));
  const completed = items.filter(({ item }) => item.isCompleted).length;
  const [stage] = await database.select({ status: stages.status }).from(stages).where(eq(stages.id, stageId));
  const materialsComplete = await isMaterialSupplyComplete(database, stageId);
  return {
    id: row.id,
    stageId: row.stageId,
    items: items.map(({ item, completedById, completedByName }) => ({
      id: item.id,
      title: item.title,
      photoHint: item.photoHint,
      position: item.position,
      isCompleted: item.isCompleted,
      requiresRework: item.requiresRework,
      completedAt: item.completedAt?.toISOString() ?? null,
      completedBy:
        completedById === null || completedByName === null ? null : { id: completedById, fullName: completedByName },
    })),
    progressPercent: items.length === 0 ? 0 : Math.round((completed * 100) / items.length),
    warnings: stage?.status === 'in_progress' && !materialsComplete ? ['materials_incomplete'] : [],
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadStage(database: Database | Transaction, stageId: number): Promise<Stage | null> {
  const [row] = await database
    .select({ stage: stages, project: projects, stageType: stageTypes })
    .from(stages)
    .innerJoin(projects, eq(stages.projectId, projects.id))
    .innerJoin(stageTypes, eq(stages.stageTypeCode, stageTypes.code))
    .where(eq(stages.id, stageId));
  if (!row) return null;
  const [assignee] = row.stage.assigneeId
    ? await database
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(eq(users.id, row.stage.assigneeId))
    : [];
  const predecessors = await database
    .select({ id: stagePredecessors.predecessorStageId })
    .from(stagePredecessors)
    .where(eq(stagePredecessors.stageId, stageId));
  const [latest] = await database
    .select({ acceptance: acceptances, decidedById: users.id, decidedByName: users.fullName })
    .from(acceptances)
    .innerJoin(users, eq(acceptances.decidedByUserId, users.id))
    .where(eq(acceptances.stageId, stageId))
    .orderBy(desc(acceptances.decidedAt), desc(acceptances.id))
    .limit(1);
  const checklist = await loadChecklist(database, stageId);
  const [workTotal] = await database
    .select({ amount: sum(workPayments.amountMinor).mapWith(Number) })
    .from(workPayments)
    .where(eq(workPayments.stageId, stageId));
  const actualWorkAmountMinor = workTotal?.amount ?? 0;
  return {
    id: row.stage.id,
    projectId: row.stage.projectId,
    projectOwnerName: row.project.ownerName,
    projectAddress: row.project.address,
    projectCoordinates: { latitude: row.project.latitude, longitude: row.project.longitude },
    projectIsArchived: row.project.isArchived,
    type: row.stage.stageTypeCode as Stage['type'],
    title: row.stageType.title as Stage['title'],
    position: row.stage.position,
    canRunInParallel: row.stage.canRunInParallel,
    workSubtypes: row.stage.workSubtypes,
    assignee: assignee ?? null,
    status: row.stage.status,
    plannedStartDate: row.stage.plannedStartDate,
    plannedEndDate: row.stage.plannedEndDate,
    plannedWorkAmountMinor: row.stage.plannedWorkAmountMinor,
    actualWorkAmountMinor,
    workBalanceAmountMinor:
      row.stage.plannedWorkAmountMinor === null ? null : row.stage.plannedWorkAmountMinor - actualWorkAmountMinor,
    plannedMaterialAmountMinor: row.stage.plannedMaterialAmountMinor,
    actualStartDate: row.stage.actualStartDate,
    actualEndDate: row.stage.actualEndDate,
    predecessorStageIds: predecessors.map(({ id }) => id),
    notes: row.stage.notes,
    progressPercent: checklist?.progressPercent ?? 0,
    latestAcceptance: latest
      ? {
          decision: latest.acceptance.decision,
          comment: latest.acceptance.comment,
          correctionDueDate: latest.acceptance.correctionDueDate,
          decidedBy: { id: latest.decidedById, fullName: latest.decidedByName },
          decidedAt: latest.acceptance.decidedAt.toISOString(),
        }
      : null,
    version: row.stage.version,
    createdAt: row.stage.createdAt.toISOString(),
    updatedAt: row.stage.updatedAt.toISOString(),
  };
}

async function lockStage(transaction: Transaction, stageId: number) {
  const [row] = await transaction
    .select({ stage: stages, isArchived: projects.isArchived })
    .from(stages)
    .innerJoin(projects, eq(stages.projectId, projects.id))
    .where(eq(stages.id, stageId))
    .for('update');
  return row;
}

type LockedStage = NonNullable<Awaited<ReturnType<typeof lockStage>>>;

function getBaseMutationError(locked: LockedStage | undefined, expectedVersion: number): StageOperationError | null {
  if (!locked) return 'not_found';
  if (locked.isArchived) return 'project_archived';
  if (locked.stage.version !== expectedVersion) return 'version_conflict';
  return null;
}

async function isActiveForeman(transaction: Transaction, assigneeId: number | null): Promise<boolean> {
  if (assigneeId === null) return true;
  const [foreman] = await transaction.select().from(users).where(eq(users.id, assigneeId));
  return foreman?.role === 'foreman' && foreman.isActive;
}

async function getStatusTransitionError(
  transaction: Transaction,
  locked: LockedStage,
  stageId: number,
  status: 'supplied' | 'paid',
): Promise<StageOperationError | null> {
  if (status === 'supplied') {
    const isComplete = await isMaterialSupplyComplete(transaction, stageId);
    return locked.stage.status === 'assigned' && isComplete ? null : 'invalid_transition';
  }
  if (locked.stage.status !== 'completed' || locked.stage.plannedWorkAmountMinor === null) {
    return 'invalid_transition';
  }
  const [paid] = await transaction
    .select({ amount: sum(workPayments.amountMinor).mapWith(Number) })
    .from(workPayments)
    .where(eq(workPayments.stageId, stageId));
  return locked.stage.plannedWorkAmountMinor - (paid?.amount ?? 0) === 0 ? null : 'invalid_transition';
}

function getChecklistUpdateError(
  locked: LockedStage | undefined,
  checklist: ChecklistRow | undefined,
  item: ChecklistItemRow | undefined,
  input: UpdateChecklistItem,
  actor: Actor,
): StageOperationError | null {
  if (!locked || !canRead(actor, locked.stage.assigneeId)) return 'not_found';
  if (locked.isArchived) return 'project_archived';
  if (!checklist || !item) return 'not_found';
  if (checklist.version !== input.expectedVersion) return 'version_conflict';
  if (!['assigned', 'supplied', 'in_progress', 'rework'].includes(locked.stage.status)) return 'invalid_transition';
  if (locked.stage.status === 'rework' && !item.requiresRework) return 'forbidden';
  return null;
}

async function hasUploadedPhoto(transaction: Transaction, itemId: number): Promise<boolean> {
  const [photo] = await transaction
    .select({ id: checklistItemPhotos.id })
    .from(checklistItemPhotos)
    .innerJoin(files, eq(checklistItemPhotos.fileId, files.id))
    .where(
      and(
        eq(checklistItemPhotos.checklistItemId, itemId),
        eq(files.status, 'uploaded'),
        sql`${checklistItemPhotos.deletedAt} is null`,
      ),
    )
    .limit(1);
  return photo !== undefined;
}

async function applyChecklistItemUpdate(
  transaction: Transaction,
  locked: LockedStage,
  checklist: ChecklistRow,
  itemId: number,
  input: UpdateChecklistItem,
  actor: Actor,
): Promise<void> {
  const now = new Date();
  await transaction
    .update(checklistItems)
    .set({
      isCompleted: input.isCompleted,
      completedAt: input.isCompleted ? now : null,
      completedByUserId: input.isCompleted ? actor.id : null,
    })
    .where(eq(checklistItems.id, itemId));
  const allItems = await transaction.select().from(checklistItems).where(eq(checklistItems.checklistId, checklist.id));
  const allCompleted =
    allItems.length > 0 &&
    allItems.every((candidate) => (candidate.id === itemId ? input.isCompleted : candidate.isCompleted));
  let nextStatus = locked.stage.status;
  let actualStartDate = locked.stage.actualStartDate;
  if (input.isCompleted && ['assigned', 'supplied'].includes(locked.stage.status)) {
    nextStatus = 'in_progress';
    actualStartDate ??= today();
  }
  if (allCompleted) {
    nextStatus = 'acceptance';
    await transaction
      .update(checklistItems)
      .set({ requiresRework: false })
      .where(eq(checklistItems.checklistId, checklist.id));
  }
  await transaction
    .update(checklists)
    .set({ version: sql`${checklists.version} + 1`, updatedAt: now })
    .where(eq(checklists.id, checklist.id));
  await transaction
    .update(stages)
    .set({ status: nextStatus, actualStartDate, version: sql`${stages.version} + 1`, updatedAt: now })
    .where(eq(stages.id, locked.stage.id));
}

export class StageRepository {
  readonly #database: Database;

  constructor(database: Database) {
    this.#database = database;
  }

  async get(stageId: number, actor: Actor): Promise<OperationResult<Stage>> {
    const [stage] = await this.#database.select().from(stages).where(eq(stages.id, stageId));
    if (!stage || !canRead(actor, stage.assigneeId)) return { status: 'not_found' };
    return { status: 'ok', value: (await loadStage(this.#database, stageId))! };
  }

  async getChecklist(stageId: number, actor: Actor): Promise<OperationResult<Checklist>> {
    const [stage] = await this.#database.select().from(stages).where(eq(stages.id, stageId));
    if (!stage || !canRead(actor, stage.assigneeId)) return { status: 'not_found' };
    const checklist = await loadChecklist(this.#database, stageId);
    return checklist ? { status: 'ok', value: checklist } : { status: 'not_found' };
  }

  assign(stageId: number, expectedVersion: number, assigneeId: number | null): Promise<OperationResult<Stage>> {
    return this.#database.transaction(async (transaction) => {
      const locked = await lockStage(transaction, stageId);
      const baseError = getBaseMutationError(locked, expectedVersion);
      if (baseError) return { status: baseError };
      if (!locked) return { status: 'not_found' };
      if (!['created', 'assigned'].includes(locked.stage.status)) return { status: 'invalid_transition' };
      if (!(await isActiveForeman(transaction, assigneeId))) return { status: 'invalid_request' };
      const status = assigneeId === null ? 'created' : 'assigned';
      if (locked.stage.assigneeId !== assigneeId || locked.stage.status !== status) {
        await transaction
          .update(stages)
          .set({ assigneeId, status, version: sql`${stages.version} + 1`, updatedAt: new Date() })
          .where(eq(stages.id, stageId));
      }
      return { status: 'ok', value: (await loadStage(transaction, stageId))! };
    });
  }

  updatePlannedWorkAmount(
    stageId: number,
    expectedVersion: number,
    plannedWorkAmountMinor: number | null,
  ): Promise<OperationResult<Stage>> {
    return this.#database.transaction(async (transaction) => {
      const locked = await lockStage(transaction, stageId);
      const baseError = getBaseMutationError(locked, expectedVersion);
      if (baseError) return { status: baseError };
      if (!locked) return { status: 'not_found' };
      if (locked.stage.status === 'paid') return { status: 'invalid_transition' };
      if (locked.stage.plannedWorkAmountMinor !== plannedWorkAmountMinor) {
        await transaction
          .update(stages)
          .set({
            plannedWorkAmountMinor,
            version: sql`${stages.version} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(stages.id, stageId));
      }
      return { status: 'ok', value: (await loadStage(transaction, stageId))! };
    });
  }

  changeStatus(stageId: number, expectedVersion: number, status: 'supplied' | 'paid'): Promise<OperationResult<Stage>> {
    return this.#database.transaction(async (transaction) => {
      const locked = await lockStage(transaction, stageId);
      const baseError = getBaseMutationError(locked, expectedVersion);
      if (baseError) return { status: baseError };
      if (!locked) return { status: 'not_found' };
      if (locked.stage.status === status) return { status: 'ok', value: (await loadStage(transaction, stageId))! };
      const transitionError = await getStatusTransitionError(transaction, locked, stageId, status);
      if (transitionError) return { status: transitionError };
      await transaction
        .update(stages)
        .set({ status, version: sql`${stages.version} + 1`, updatedAt: new Date() })
        .where(eq(stages.id, stageId));
      return { status: 'ok', value: (await loadStage(transaction, stageId))! };
    });
  }

  updateChecklistItem(
    stageId: number,
    itemId: number,
    input: UpdateChecklistItem,
    actor: Actor,
  ): Promise<OperationResult<Checklist>> {
    return this.#database.transaction(async (transaction) => {
      const locked = await lockStage(transaction, stageId);
      const [checklist] = await transaction
        .select()
        .from(checklists)
        .where(eq(checklists.stageId, stageId))
        .for('update');
      const [item] = await transaction
        .select()
        .from(checklistItems)
        .where(and(eq(checklistItems.id, itemId), eq(checklistItems.checklistId, checklist?.id ?? -1)));
      const validationError = getChecklistUpdateError(locked, checklist, item, input, actor);
      if (validationError) return { status: validationError };
      if (!locked || !checklist || !item) return { status: 'not_found' };
      if (item.isCompleted === input.isCompleted) {
        return { status: 'ok', value: (await loadChecklist(transaction, stageId))! };
      }
      if (input.isCompleted && !(await hasUploadedPhoto(transaction, itemId))) return { status: 'photo_required' };
      await applyChecklistItemUpdate(transaction, locked, checklist, itemId, input, actor);
      return { status: 'ok', value: (await loadChecklist(transaction, stageId))! };
    });
  }

  returnForRework(stageId: number, input: RejectStage, actor: Actor): Promise<OperationResult<Stage>> {
    return this.#database.transaction(async (transaction) => {
      const locked = await lockStage(transaction, stageId);
      if (!locked) return { status: 'not_found' };
      if (locked.isArchived) return { status: 'project_archived' };
      if (locked.stage.version !== input.expectedVersion) return { status: 'version_conflict' };
      if (locked.stage.status !== 'acceptance') return { status: 'invalid_transition' };
      if (input.correctionDueDate < today()) return { status: 'invalid_request' };
      const [checklist] = await transaction.select().from(checklists).where(eq(checklists.stageId, stageId));
      if (!checklist || new Set(input.itemIds).size !== input.itemIds.length) return { status: 'invalid_request' };
      const selected = await transaction
        .select({ id: checklistItems.id })
        .from(checklistItems)
        .where(and(eq(checklistItems.checklistId, checklist.id), inArray(checklistItems.id, input.itemIds)));
      if (selected.length !== input.itemIds.length) return { status: 'invalid_request' };
      const [acceptance] = await transaction
        .insert(acceptances)
        .values({
          stageId,
          decision: 'rejected',
          comment: input.comment,
          correctionDueDate: input.correctionDueDate,
          decidedByUserId: actor.id,
        })
        .returning({ id: acceptances.id });
      await transaction
        .insert(acceptanceItems)
        .values(input.itemIds.map((checklistItemId) => ({ acceptanceId: acceptance!.id, checklistItemId })));
      await transaction
        .update(checklistItems)
        .set({ isCompleted: false, requiresRework: true, completedAt: null, completedByUserId: null })
        .where(inArray(checklistItems.id, input.itemIds));
      const now = new Date();
      await transaction
        .update(checklists)
        .set({ version: sql`${checklists.version} + 1`, updatedAt: now })
        .where(eq(checklists.id, checklist.id));
      await transaction
        .update(stages)
        .set({ status: 'rework', version: sql`${stages.version} + 1`, updatedAt: now })
        .where(eq(stages.id, stageId));
      return { status: 'ok', value: (await loadStage(transaction, stageId))! };
    });
  }

  accept(
    stageId: number,
    input: { expectedVersion: number; comment?: string | null | undefined },
    actor: Actor,
  ): Promise<OperationResult<Stage>> {
    return this.#database.transaction(async (transaction) => {
      const locked = await lockStage(transaction, stageId);
      if (!locked) return { status: 'not_found' };
      if (locked.isArchived) return { status: 'project_archived' };
      if (locked.stage.version !== input.expectedVersion) return { status: 'version_conflict' };
      if (locked.stage.status !== 'acceptance') return { status: 'invalid_transition' };
      const [checklist] = await transaction.select().from(checklists).where(eq(checklists.stageId, stageId));
      const items = checklist
        ? await transaction.select().from(checklistItems).where(eq(checklistItems.checklistId, checklist.id))
        : [];
      if (items.length === 0 || items.some((item) => !item.isCompleted)) return { status: 'invalid_transition' };
      await transaction.insert(acceptances).values({
        stageId,
        decision: 'accepted',
        comment: input.comment ?? null,
        correctionDueDate: null,
        decidedByUserId: actor.id,
      });
      await transaction
        .update(stages)
        .set({
          status: 'completed',
          actualEndDate: today(),
          version: sql`${stages.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(stages.id, stageId));
      return { status: 'ok', value: (await loadStage(transaction, stageId))! };
    });
  }
}
