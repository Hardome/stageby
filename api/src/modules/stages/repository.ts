import { and, asc, count, desc, eq, inArray, isNull, lt, sql, sum } from 'drizzle-orm';

import { acceptanceItems, acceptances } from '#app/db/schema/acceptances';
import {
  type ChecklistItemRow,
  type ChecklistRow,
  checklistItems,
  checklists,
  checklistTemplateItems,
  checklistTemplates,
} from '#app/db/schema/checklists';
import { checklistItemPhotos, files } from '#app/db/schema/files';
import { projects } from '#app/db/schema/projects';
import { stageTypes } from '#app/db/schema/stage-types';
import { stagePredecessors, stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import { workPayments } from '#app/db/schema/work-payments';
import type {
  ActiveStageType,
  Checklist,
  ConfigureChecklist,
  ListStagesData,
  ProjectStages,
  RejectStage,
  Stage,
  StagePage,
  UpdateChecklistItem,
  UpdateStage,
} from '#app/generated/types.gen';
import type { AuditContext } from '#app/modules/audit/context';
import { type AuditWriter, auditedTransaction } from '#app/modules/audit/repository';
import { addCalendarDays, calendarDate } from '#app/modules/dashboard/calendar';
import { isSupplyComplete, loadStageSummaries } from '#app/modules/materials/summary';
import type { Actor, Database, OperationResult, StageOperationError } from '#app/modules/stages/types';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

function today(): string {
  return calendarDate();
}

function canRead(actor: Actor, assigneeId: number | null): boolean {
  return actor.role === 'manager' || (actor.role === 'foreman' && assigneeId === actor.id);
}

async function isMaterialSupplyComplete(database: Database | Transaction, stageId: number): Promise<boolean> {
  const summary = (await loadStageSummaries(database, [stageId])).get(stageId);
  return summary !== undefined && isSupplyComplete(summary.materialSummary);
}

async function loadChecklist(database: Database | Transaction, stageId: number): Promise<Checklist | null> {
  const [row] = await database.select().from(checklists).where(eq(checklists.stageId, stageId));
  if (!row) return null;
  const items = await database
    .select({ item: checklistItems, completedById: users.id, completedByName: users.fullName })
    .from(checklistItems)
    .leftJoin(users, eq(checklistItems.completedByUserId, users.id))
    .where(and(eq(checklistItems.checklistId, row.id), isNull(checklistItems.deletedAt)))
    .orderBy(asc(checklistItems.position), asc(checklistItems.id));
  const completed = items.filter(({ item }) => item.isCompleted).length;
  const [stage] = await database
    .select({
      status: stages.status,
      actualStartDate: stages.actualStartDate,
      projectId: stages.projectId,
      position: stages.position,
    })
    .from(stages)
    .where(eq(stages.id, stageId));
  const materialsComplete = await isMaterialSupplyComplete(database, stageId);
  const [previousStage] = stage
    ? await database
        .select({ status: stages.status })
        .from(stages)
        .where(and(eq(stages.projectId, stage.projectId), lt(stages.position, stage.position)))
        .orderBy(desc(stages.position))
        .limit(1)
    : [];
  const warnings: Checklist['warnings'] = [];
  if (stage?.status === 'in_progress' && !materialsComplete) warnings.push('materials_incomplete');
  if (
    stage?.actualStartDate !== null &&
    previousStage !== undefined &&
    !['completed', 'paid'].includes(previousStage.status)
  ) {
    warnings.push('predecessor_incomplete');
  }
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
    warnings,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function loadStages(database: Database | Transaction, ids: number[]): Promise<Stage[]> {
  if (ids.length === 0) return [];
  const rows = await database
    .select({
      stage: stages,
      project: projects,
      stageType: stageTypes,
      assigneeId: users.id,
      assigneeName: users.fullName,
      progressPercent:
        sql<number>`(select coalesce(round(100.0 * count(*) filter (where i."isCompleted") / nullif(count(*), 0)), 0)
        from checklist_items i join checklists c on c.id = i."checklistId" where c."stageId" = "stages".id and i."deletedAt" is null)`.mapWith(
          Number,
        ),
    })
    .from(stages)
    .innerJoin(projects, eq(stages.projectId, projects.id))
    .innerJoin(stageTypes, eq(stages.stageTypeCode, stageTypes.code))
    .leftJoin(users, eq(stages.assigneeId, users.id))
    .where(inArray(stages.id, ids));
  const finances = await loadStageSummaries(database, ids);
  const predecessors = await database
    .select()
    .from(stagePredecessors)
    .where(inArray(stagePredecessors.stageId, ids))
    .orderBy(asc(stagePredecessors.predecessorStageId));
  const latest = await database
    .selectDistinctOn([acceptances.stageId], {
      acceptance: acceptances,
      decidedById: users.id,
      decidedByName: users.fullName,
    })
    .from(acceptances)
    .innerJoin(users, eq(acceptances.decidedByUserId, users.id))
    .where(inArray(acceptances.stageId, ids))
    .orderBy(asc(acceptances.stageId), desc(acceptances.decidedAt), desc(acceptances.id));
  const latestByStage = new Map(latest.map((row) => [row.acceptance.stageId, row]));
  const predecessorsByStage = Map.groupBy(predecessors, (row) => row.stageId);
  const mapped = new Map(
    rows.map((row) => {
      const decision = latestByStage.get(row.stage.id);
      const value: Stage = {
        id: row.stage.id,
        projectId: row.stage.projectId,
        projectOwnerName: row.project.ownerName,
        projectAddress: row.project.address,
        projectCoordinates: { latitude: row.project.latitude, longitude: row.project.longitude },
        projectIsArchived: row.project.isArchived,
        type: row.stage.stageTypeCode as Stage['type'],
        title: row.stageType.title as Stage['title'],
        position: row.stage.position,
        workSubtypes: row.stage.workSubtypes,
        assignee: row.assigneeId === null ? null : { id: row.assigneeId, fullName: row.assigneeName! },
        status: row.stage.status,
        plannedStartDate: row.stage.plannedStartDate,
        plannedEndDate: row.stage.plannedEndDate,
        ...finances.get(row.stage.id)!,
        actualStartDate: row.stage.actualStartDate,
        actualEndDate: row.stage.actualEndDate,
        predecessorStageIds: (predecessorsByStage.get(row.stage.id) ?? []).map((p) => p.predecessorStageId),
        notes: row.stage.notes,
        progressPercent: row.progressPercent,
        latestAcceptance: decision
          ? {
              decision: decision.acceptance.decision,
              comment: decision.acceptance.comment,
              correctionDueDate: decision.acceptance.correctionDueDate,
              decidedBy: { id: decision.decidedById, fullName: decision.decidedByName },
              decidedAt: decision.acceptance.decidedAt.toISOString(),
            }
          : null,
        version: row.stage.version,
        createdAt: row.stage.createdAt.toISOString(),
        updatedAt: row.stage.updatedAt.toISOString(),
      };
      return [row.stage.id, value] as const;
    }),
  );
  return ids.flatMap((id) => {
    const row = mapped.get(id);
    return row ? [row] : [];
  });
}

async function loadStage(database: Database | Transaction, stageId: number): Promise<Stage | null> {
  return (await loadStages(database, [stageId]))[0] ?? null;
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

async function getStagePatchError(
  transaction: Transaction,
  locked: LockedStage,
  input: UpdateStage,
): Promise<StageOperationError | null> {
  if (['completed', 'paid'].includes(locked.stage.status)) return 'invalid_transition';
  const [project] = await transaction.select().from(projects).where(eq(projects.id, locked.stage.projectId));
  const start = input.plannedStartDate ?? locked.stage.plannedStartDate;
  const end = input.plannedEndDate ?? locked.stage.plannedEndDate;
  if (end < start || start < project!.plannedStartDate || end > project!.plannedEndDate) return 'invalid_request';
  if (input.assigneeId !== undefined) {
    if (input.assigneeId === null && !['created', 'assigned'].includes(locked.stage.status))
      return 'invalid_transition';
    if (!(await isActiveForeman(transaction, input.assigneeId))) return 'invalid_request';
  }
  return null;
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
  return locked.stage.plannedWorkAmountMinor - (paid?.amount ?? 0) <= 0 ? null : 'invalid_transition';
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
  audit: AuditWriter,
): Promise<void> {
  const now = new Date();
  await audit.mutate(checklistItems, eq(checklistItems.id, itemId), () =>
    transaction
      .update(checklistItems)
      .set({
        isCompleted: input.isCompleted,
        completedAt: input.isCompleted ? now : null,
        completedByUserId: input.isCompleted ? actor.id : null,
      })
      .where(eq(checklistItems.id, itemId)),
  );
  const allItems = await transaction
    .select()
    .from(checklistItems)
    .where(and(eq(checklistItems.checklistId, checklist.id), isNull(checklistItems.deletedAt)));
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
    await audit.mutate(checklistItems, eq(checklistItems.checklistId, checklist.id), () =>
      transaction
        .update(checklistItems)
        .set({ requiresRework: false })
        .where(and(eq(checklistItems.checklistId, checklist.id), isNull(checklistItems.deletedAt))),
    );
  }
  await audit.mutate(checklists, eq(checklists.id, checklist.id), () =>
    transaction
      .update(checklists)
      .set({ version: sql`${checklists.version} + 1`, updatedAt: now })
      .where(eq(checklists.id, checklist.id)),
  );
  await audit.mutate(stages, eq(stages.id, locked.stage.id), () =>
    transaction
      .update(stages)
      .set({ status: nextStatus, actualStartDate, version: sql`${stages.version} + 1`, updatedAt: now })
      .where(eq(stages.id, locked.stage.id)),
  );
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

  async list(query: NonNullable<ListStagesData['query']>, actor: Actor): Promise<StagePage> {
    const { limit = 20, offset = 0 } = query;
    const where = and(
      actor.role === 'manager' ? undefined : eq(stages.assigneeId, actor.id),
      query.projectId === undefined ? undefined : eq(stages.projectId, query.projectId),
      query.assigneeId === undefined ? undefined : eq(stages.assigneeId, query.assigneeId),
      query.status === undefined ? undefined : eq(stages.status, query.status),
      query.includeArchived ? undefined : eq(projects.isArchived, false),
    );
    const [rows, totals] = await Promise.all([
      this.#database
        .select({ id: stages.id })
        .from(stages)
        .innerJoin(projects, eq(stages.projectId, projects.id))
        .where(where)
        .orderBy(asc(stages.projectId), asc(stages.position), asc(stages.id))
        .limit(limit)
        .offset(offset),
      this.#database
        .select({ value: count() })
        .from(stages)
        .innerJoin(projects, eq(stages.projectId, projects.id))
        .where(where),
    ]);
    return {
      items: await loadStages(
        this.#database,
        rows.map((row) => row.id),
      ),
      total: totals[0]!.value,
      limit,
      offset,
    };
  }

  async listProject(projectId: number, actor: Actor): Promise<OperationResult<ProjectStages>> {
    const [project] = await this.#database.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId));
    if (!project) return { status: 'not_found' };
    const rows = await this.#database
      .select({ id: stages.id })
      .from(stages)
      .where(
        and(eq(stages.projectId, projectId), actor.role === 'manager' ? undefined : eq(stages.assigneeId, actor.id)),
      )
      .orderBy(asc(stages.position), asc(stages.id));
    if (actor.role !== 'manager' && rows.length === 0) return { status: 'not_found' };
    return {
      status: 'ok',
      value: {
        items: await loadStages(
          this.#database,
          rows.map((row) => row.id),
        ),
      },
    };
  }

  async activeTypes(): Promise<ActiveStageType[]> {
    const rows = await this.#database
      .select({ type: stageTypes, template: checklistTemplates })
      .from(stageTypes)
      .innerJoin(
        checklistTemplates,
        and(eq(checklistTemplates.stageTypeCode, stageTypes.code), eq(checklistTemplates.isActive, true)),
      )
      .where(eq(stageTypes.isActive, true))
      .orderBy(asc(stageTypes.position), asc(stageTypes.code));
    const items =
      rows.length === 0
        ? []
        : await this.#database
            .select()
            .from(checklistTemplateItems)
            .where(
              inArray(
                checklistTemplateItems.checklistTemplateId,
                rows.map((row) => row.template.id),
              ),
            )
            .orderBy(asc(checklistTemplateItems.position), asc(checklistTemplateItems.id));
    const byTemplate = Map.groupBy(items, (item) => item.checklistTemplateId);
    return rows.flatMap(({ type, template }) => {
      const checklistItems = (byTemplate.get(template.id) ?? []).map(({ id, position, title, photoHint }) => ({
        id,
        position,
        title,
        photoHint,
      }));
      return checklistItems.length === 0
        ? []
        : [
            {
              code: type.code as ActiveStageType['code'],
              title: type.title,
              position: type.position,
              checklistTemplateId: template.id,
              checklistItems,
            },
          ];
    });
  }

  patch(stageId: number, input: UpdateStage, context: AuditContext): Promise<OperationResult<Stage>> {
    return auditedTransaction(this.#database, context, 'updateStage', async (transaction, audit) => {
      const locked = await lockStage(transaction, stageId);
      const error = getBaseMutationError(locked, input.expectedVersion);
      if (error) return { status: error };
      if (!locked) return { status: 'not_found' };
      const patchError = await getStagePatchError(transaction, locked, input);
      if (patchError) return { status: patchError };
      const { expectedVersion: _version, ...fields } = input;
      const updated = { ...locked.stage, ...fields };
      let status = locked.stage.status;
      if (['created', 'assigned'].includes(status)) status = updated.assigneeId === null ? 'created' : 'assigned';
      if (
        Object.entries(fields).some(
          ([key, value]) => JSON.stringify(locked.stage[key as keyof typeof locked.stage]) !== JSON.stringify(value),
        ) ||
        status !== locked.stage.status
      ) {
        await audit.mutate(stages, eq(stages.id, stageId), () =>
          transaction
            .update(stages)
            .set({ ...fields, status, version: sql`${stages.version} + 1`, updatedAt: new Date() })
            .where(eq(stages.id, stageId)),
        );
      }
      return { status: 'ok', value: (await loadStage(transaction, stageId))! };
    });
  }

  configureChecklist(
    stageId: number,
    input: ConfigureChecklist,
    context: AuditContext,
  ): Promise<OperationResult<Checklist>> {
    return auditedTransaction(this.#database, context, 'configureStageChecklist', async (transaction, audit) => {
      const locked = await lockStage(transaction, stageId);
      if (!locked) return { status: 'not_found' };
      if (locked.isArchived) return { status: 'project_archived' };
      const [checklist] = await transaction
        .select()
        .from(checklists)
        .where(eq(checklists.stageId, stageId))
        .for('update');
      if (!checklist) return { status: 'not_found' };
      if (checklist.version !== input.expectedVersion) return { status: 'version_conflict' };
      if (!['created', 'assigned', 'supplied'].includes(locked.stage.status)) return { status: 'invalid_transition' };
      const now = new Date();
      const active = and(eq(checklistItems.checklistId, checklist.id), isNull(checklistItems.deletedAt));
      await audit.mutate(checklistItems, active, () =>
        transaction.update(checklistItems).set({ deletedAt: now }).where(active),
      );
      await audit.created(
        checklistItems,
        await transaction
          .insert(checklistItems)
          .values(
            input.items.map((item, index) => ({
              checklistId: checklist.id,
              position: index + 1,
              title: item.title,
              photoHint: item.photoHint,
            })),
          )
          .returning(),
      );
      await audit.mutate(checklists, eq(checklists.id, checklist.id), () =>
        transaction
          .update(checklists)
          .set({ version: sql`${checklists.version} + 1`, updatedAt: now })
          .where(eq(checklists.id, checklist.id)),
      );
      await audit.mutate(stages, eq(stages.id, stageId), () =>
        transaction
          .update(stages)
          .set({ version: sql`${stages.version} + 1`, updatedAt: now })
          .where(eq(stages.id, stageId)),
      );
      return { status: 'ok', value: (await loadChecklist(transaction, stageId))! };
    });
  }

  changeStatus(
    stageId: number,
    expectedVersion: number,
    status: 'supplied' | 'paid',
    context: AuditContext = { source: 'system' },
  ): Promise<OperationResult<Stage>> {
    return auditedTransaction(this.#database, context, 'changeStageStatus', async (transaction, audit) => {
      const locked = await lockStage(transaction, stageId);
      const baseError = getBaseMutationError(locked, expectedVersion);
      if (baseError) return { status: baseError };
      if (!locked) return { status: 'not_found' };
      if (locked.stage.status === status) return { status: 'ok', value: (await loadStage(transaction, stageId))! };
      const transitionError = await getStatusTransitionError(transaction, locked, stageId, status);
      if (transitionError) return { status: transitionError };
      await audit.mutate(stages, eq(stages.id, stageId), () =>
        transaction
          .update(stages)
          .set({ status, version: sql`${stages.version} + 1`, updatedAt: new Date() })
          .where(eq(stages.id, stageId)),
      );
      return { status: 'ok', value: (await loadStage(transaction, stageId))! };
    });
  }

  updateChecklistItem(
    stageId: number,
    itemId: number,
    input: UpdateChecklistItem,
    actor: Actor,
    context: AuditContext = { source: 'system' },
  ): Promise<OperationResult<Checklist>> {
    return auditedTransaction(this.#database, context, 'updateChecklistItem', async (transaction, audit) => {
      const locked = await lockStage(transaction, stageId);
      const [checklist] = await transaction
        .select()
        .from(checklists)
        .where(eq(checklists.stageId, stageId))
        .for('update');
      const [item] = await transaction
        .select()
        .from(checklistItems)
        .where(
          and(
            eq(checklistItems.id, itemId),
            eq(checklistItems.checklistId, checklist?.id ?? -1),
            isNull(checklistItems.deletedAt),
          ),
        );
      const validationError = getChecklistUpdateError(locked, checklist, item, input, actor);
      if (validationError) return { status: validationError };
      if (!locked || !checklist || !item) return { status: 'not_found' };
      if (item.isCompleted === input.isCompleted) {
        return { status: 'ok', value: (await loadChecklist(transaction, stageId))! };
      }
      if (input.isCompleted && !(await hasUploadedPhoto(transaction, itemId))) return { status: 'photo_required' };
      await applyChecklistItemUpdate(transaction, locked, checklist, itemId, input, actor, audit);
      return { status: 'ok', value: (await loadChecklist(transaction, stageId))! };
    });
  }

  returnForRework(
    stageId: number,
    input: RejectStage,
    actor: Actor,
    context: AuditContext = { source: 'system' },
  ): Promise<OperationResult<Stage>> {
    const currentDate = today();
    const correctionDueDate = input.correctionDueDate ?? addCalendarDays(currentDate, 2);
    return auditedTransaction(this.#database, context, 'returnStageForRework', async (transaction, audit) => {
      const locked = await lockStage(transaction, stageId);
      if (!locked) return { status: 'not_found' };
      if (locked.isArchived) return { status: 'project_archived' };
      if (locked.stage.version !== input.expectedVersion) return { status: 'version_conflict' };
      if (locked.stage.status !== 'acceptance') return { status: 'invalid_transition' };
      if (correctionDueDate < currentDate) return { status: 'invalid_request' };
      const [checklist] = await transaction.select().from(checklists).where(eq(checklists.stageId, stageId));
      if (!checklist || new Set(input.itemIds).size !== input.itemIds.length) return { status: 'invalid_request' };
      const selected = await transaction
        .select({ id: checklistItems.id })
        .from(checklistItems)
        .where(
          and(
            eq(checklistItems.checklistId, checklist.id),
            inArray(checklistItems.id, input.itemIds),
            isNull(checklistItems.deletedAt),
          ),
        );
      if (selected.length !== input.itemIds.length) return { status: 'invalid_request' };
      const [acceptance] = await audit.created(
        acceptances,
        await transaction
          .insert(acceptances)
          .values({
            stageId,
            decision: 'rejected',
            comment: input.comment,
            correctionDueDate,
            decidedByUserId: actor.id,
          })
          .returning(),
      );
      await audit.created(
        acceptanceItems,
        await transaction
          .insert(acceptanceItems)
          .values(input.itemIds.map((checklistItemId) => ({ acceptanceId: acceptance!.id, checklistItemId })))
          .returning(),
      );
      await audit.mutate(checklistItems, inArray(checklistItems.id, input.itemIds), () =>
        transaction
          .update(checklistItems)
          .set({ isCompleted: false, requiresRework: true, completedAt: null, completedByUserId: null })
          .where(inArray(checklistItems.id, input.itemIds)),
      );
      const now = new Date();
      await audit.mutate(checklists, eq(checklists.id, checklist.id), () =>
        transaction
          .update(checklists)
          .set({ version: sql`${checklists.version} + 1`, updatedAt: now })
          .where(eq(checklists.id, checklist.id)),
      );
      await audit.mutate(stages, eq(stages.id, stageId), () =>
        transaction
          .update(stages)
          .set({ status: 'rework', version: sql`${stages.version} + 1`, updatedAt: now })
          .where(eq(stages.id, stageId)),
      );
      return { status: 'ok', value: (await loadStage(transaction, stageId))! };
    });
  }

  accept(
    stageId: number,
    input: { expectedVersion: number; comment?: string | null | undefined },
    actor: Actor,
    context: AuditContext = { source: 'system' },
  ): Promise<OperationResult<Stage>> {
    return auditedTransaction(this.#database, context, 'acceptStage', async (transaction, audit) => {
      const locked = await lockStage(transaction, stageId);
      if (!locked) return { status: 'not_found' };
      if (locked.isArchived) return { status: 'project_archived' };
      if (locked.stage.version !== input.expectedVersion) return { status: 'version_conflict' };
      if (locked.stage.status !== 'acceptance') return { status: 'invalid_transition' };
      const [checklist] = await transaction.select().from(checklists).where(eq(checklists.stageId, stageId));
      const items = checklist
        ? await transaction
            .select()
            .from(checklistItems)
            .where(and(eq(checklistItems.checklistId, checklist.id), isNull(checklistItems.deletedAt)))
        : [];
      if (items.length === 0 || items.some((item) => !item.isCompleted)) return { status: 'invalid_transition' };
      await audit.created(
        acceptances,
        await transaction
          .insert(acceptances)
          .values({
            stageId,
            decision: 'accepted',
            comment: input.comment ?? null,
            correctionDueDate: null,
            decidedByUserId: actor.id,
          })
          .returning(),
      );
      await audit.mutate(stages, eq(stages.id, stageId), () =>
        transaction
          .update(stages)
          .set({
            status: 'completed',
            actualEndDate: today(),
            version: sql`${stages.version} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(stages.id, stageId)),
      );
      return { status: 'ok', value: (await loadStage(transaction, stageId))! };
    });
  }
}
