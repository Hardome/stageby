import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { checklistItems, checklists } from '#app/db/schema/checklists';
import { files, projectDocuments } from '#app/db/schema/files';
import { type ProjectRow, projects } from '#app/db/schema/projects';
import { stageTypes } from '#app/db/schema/stage-types';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import { workPayments } from '#app/db/schema/work-payments';
import { workPlanRows } from '#app/db/schema/work-plan-rows';
import type {
  CreateAdditionalStage,
  Project,
  ProjectEdit,
  ProjectWorkPlanRowChange,
  UpdateProject,
  UpdateProjectStage,
} from '#app/generated/types.gen';
import type { AuditWriter } from '#app/modules/audit/repository';
import { loadProjects } from '#app/modules/projects/read';
import { stageDatesValid } from '#app/modules/stages/dates';
import { loadChecklist, loadStages } from '#app/modules/stages/repository';
import type { Database, OperationResult, StageOperationError } from '#app/modules/stages/types';
import { preservesPaidInvariant } from '#app/modules/work-payments/paid-invariant';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type StageRow = typeof stages.$inferSelect;
type PlanRow = typeof workPlanRows.$inferSelect;
export type ProjectUpdateResult = OperationResult<Project> & { details?: { path: string; message: string }[] };

function failure(status: StageOperationError, path: string, message: string): ProjectUpdateResult {
  return { status, details: [{ path: `body.${path}`, message }] };
}

export async function loadProjectEdit(tx: Transaction, projectId: number): Promise<OperationResult<ProjectEdit>> {
  const [row] = await tx.select().from(projects).where(eq(projects.id, projectId));
  if (!row) return { status: 'not_found' };
  const stageRows = await tx
    .select({ id: stages.id })
    .from(stages)
    .where(eq(stages.projectId, projectId))
    .orderBy(asc(stages.position), asc(stages.id));
  const values = await loadStages(
    tx,
    stageRows.map((stage) => stage.id),
  );
  const result: ProjectEdit['stages'] = [];
  for (const stage of values) {
    const checklist = await loadChecklist(tx, stage.id);
    if (!checklist) throw new Error('Stage checklist is missing');
    const rows = await tx
      .select()
      .from(workPlanRows)
      .where(eq(workPlanRows.stageId, stage.id))
      .orderBy(asc(workPlanRows.id));
    result.push({
      stage,
      checklist,
      workPlanRows: rows.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    });
  }
  return { status: 'ok', value: { project: (await loadProjects(tx, [row]))[0]!, stages: result } };
}

async function validForeman(tx: Transaction, id: number | null | undefined) {
  if (id == null) return true;
  const [user] = await tx.select().from(users).where(eq(users.id, id)).for('share');
  return user?.isActive && user.role === 'foreman';
}

function stageFields(input: UpdateProjectStage) {
  const { id: _id, expectedVersion: _version, checklist: _checklist, workPlanRows: _rows, ...fields } = input;
  return fields;
}

async function canExclude(tx: Transaction, row: StageRow) {
  if (row.actualStartDate !== null) return false;
  const [resources] = await tx
    .select({
      exists: sql<boolean>`exists(select 1 from checklist_item_photos p
      join checklist_items i on i.id = p."checklistItemId" join checklists c on c.id = i."checklistId"
      where c."stageId" = ${row.id}) or exists(select 1 from material_invoices i where i."stageId" = ${row.id})
      or exists(select 1 from work_payments p where p."stageId" = ${row.id})`,
    })
    .from(stages)
    .where(eq(stages.id, row.id));
  return !resources?.exists;
}

async function validateRowRemoval(tx: Transaction, row: PlanRow, change: ProjectWorkPlanRowChange, path: string) {
  if (!(change.delete || change.distribute)) return null;
  if (
    (change.delete && change.distribute) ||
    [change.amountMinor, change.recipientId, change.dueDate].some((value) => value !== undefined)
  )
    return failure('invalid_request', path, 'Удаление и распределение нельзя сочетать с правками полей.');
  const [payment] = await tx
    .select({ id: workPayments.id })
    .from(workPayments)
    .where(eq(workPayments.workPlanRowId, row.id))
    .limit(1);
  if (payment) return failure('invalid_transition', path, 'Нельзя удалить или распределить строку с выплатами.');
  if (
    change.distribute &&
    (row.recipientId !== null ||
      change.distribute.length < 2 ||
      change.distribute.reduce((sum, item) => sum + BigInt(item.amountMinor), 0n) !== BigInt(row.amountMinor))
  )
    return failure(
      'invalid_request',
      path + '.distribute',
      'Распределение требует строки без получателя и сохранения суммы.',
    );
  return null;
}

async function validateRowChange(
  tx: Transaction,
  byId: Map<number, PlanRow>,
  seen: Set<number>,
  change: ProjectWorkPlanRowChange,
  path: string,
) {
  if (change.id === undefined) {
    if (
      change.amountMinor === undefined ||
      [change.expectedVersion, change.delete, change.distribute].some((value) => value !== undefined)
    )
      return failure('invalid_request', path, 'Новая строка требует сумму и не принимает версию или удаление.');
  } else {
    const row = byId.get(change.id);
    if (!row || seen.has(change.id))
      return failure('invalid_request', path + '.id', 'Строка не принадлежит этапу или повторяется.');
    seen.add(change.id);
    if (change.expectedVersion === undefined)
      return failure('invalid_request', `${path}.expectedVersion`, 'Для существующей строки нужна версия.');
    if (row.version !== change.expectedVersion)
      return failure('version_conflict', path + '.expectedVersion', 'Версия строки устарела.');
    const error = await validateRowRemoval(tx, row, change, path);
    if (error) return error;
  }
  return validateRecipients(tx, change.distribute ?? [change], path);
}

async function validateRecipients(tx: Transaction, rows: { recipientId?: number | null }[], path: string) {
  for (const row of rows)
    if (!(await validForeman(tx, row.recipientId)))
      return failure('invalid_request', path, 'Получатель должен быть активным мастером.');
  return null;
}

async function validatePlanChanges(
  tx: Transaction,
  stageId: number,
  changes: ProjectWorkPlanRowChange[],
  path: string,
) {
  const existing = await tx
    .select()
    .from(workPlanRows)
    .where(eq(workPlanRows.stageId, stageId))
    .orderBy(asc(workPlanRows.id))
    .for('update');
  const byId = new Map(existing.map((row) => [row.id, row]));
  const seen = new Set<number>();
  for (const [index, change] of changes.entries()) {
    const error = await validateRowChange(tx, byId, seen, change, path + '.workPlanRows.' + index);
    if (error) return error;
  }
  return null;
}

async function validateStageChange(tx: Transaction, current: StageRow, input: UpdateProjectStage, path: string) {
  if (current.version !== input.expectedVersion)
    return failure('version_conflict', `${path}.expectedVersion`, 'Версия этапа устарела.');
  const next = { ...current, ...stageFields(input) };
  if (current.isIncluded && !next.isIncluded && !(await canExclude(tx, current)))
    return failure(
      'invalid_transition',
      `${path}.isIncluded`,
      'Исключение запрещено после старта или при наличии фото, счетов или выплат.',
    );
  if (
    (input.assigneeId !== undefined || (!current.isIncluded && next.isIncluded)) &&
    !(await validForeman(tx, next.assigneeId))
  )
    return failure('invalid_request', `${path}.assigneeId`, 'Назначить можно только активного мастера.');
  if (!(await preservesPaidInvariant(tx, next)))
    return failure(
      'invalid_transition',
      `${path}.plannedWorkAmountMinor`,
      'Нарушен финансовый инвариант выплаченного этапа.',
    );
  const error = await validateStageChecklist(tx, current, next, input, path);
  return error ?? (await validatePlanChanges(tx, current.id, input.workPlanRows ?? [], path));
}

async function validateStageChecklist(
  tx: Transaction,
  current: StageRow,
  next: StageRow,
  input: UpdateProjectStage,
  path: string,
) {
  const [checklist] = await tx.select().from(checklists).where(eq(checklists.stageId, current.id)).for('update');
  if (!checklist) return failure('invalid_request', `${path}.checklist`, 'Чек-лист отсутствует.');
  if (input.checklist) {
    if (checklist.version !== input.checklist.expectedVersion)
      return failure('version_conflict', `${path}.checklist.expectedVersion`, 'Версия чек-листа устарела.');
    if (current.actualStartDate !== null && !(await checklistMatches(tx, checklist.id, input.checklist.items)))
      return failure('invalid_transition', `${path}.checklist`, 'Состав нельзя менять после фактического старта.');
  }
  if (!current.isIncluded && next.isIncluded && !input.checklist) {
    const [item] = await tx
      .select({ id: checklistItems.id })
      .from(checklistItems)
      .where(and(eq(checklistItems.checklistId, checklist.id), isNull(checklistItems.deletedAt)))
      .limit(1);
    if (!item) return failure('invalid_request', `${path}.checklist`, 'Восстановление требует непустого чек-листа.');
  }
  return null;
}

async function validateDocuments(
  tx: Transaction,
  projectId: number,
  ids: number[],
  actorId: number | null | undefined,
) {
  if (new Set(ids).size !== ids.length)
    return failure('invalid_request', 'documentFileIds', 'Файлы не должны повторяться.');
  for (const id of [...ids].sort((a, b) => a - b)) {
    const index = ids.indexOf(id);
    const [file] = await tx.select().from(files).where(eq(files.id, id)).for('update');
    const [link] = await tx.select().from(projectDocuments).where(eq(projectDocuments.fileId, id));
    if (
      !file ||
      file.status !== 'uploaded' ||
      file.purpose !== 'project_document' ||
      file.mimeType !== 'application/pdf' ||
      file.sizeBytes > 50 * 1024 * 1024 ||
      (link ? link.projectId !== projectId : actorId != null && file.uploadedByUserId !== actorId)
    )
      return failure(
        'invalid_request',
        `documentFileIds.${index}`,
        'Файл отсутствует, недоступен или не является загруженным PDF проекта.',
      );
  }
  return null;
}

async function applyDocuments(tx: Transaction, audit: AuditWriter, projectId: number, ids: number[]) {
  const current = await tx.select().from(projectDocuments).where(eq(projectDocuments.projectId, projectId));
  for (const row of current)
    if (!ids.includes(row.fileId))
      await audit.mutate(projectDocuments, eq(projectDocuments.id, row.id), () =>
        tx.delete(projectDocuments).where(eq(projectDocuments.id, row.id)),
      );
  // Avoid the unique position constraint while reordering, keeping attachment IDs.
  for (const row of current.filter((row) => ids.includes(row.fileId)))
    await audit.mutate(projectDocuments, eq(projectDocuments.id, row.id), () =>
      tx
        .update(projectDocuments)
        .set({ position: row.position + current.length + ids.length })
        .where(eq(projectDocuments.id, row.id)),
    );
  for (const [index, fileId] of ids.entries()) {
    const row = current.find((value) => value.fileId === fileId);
    if (row)
      await audit.mutate(projectDocuments, eq(projectDocuments.id, row.id), () =>
        tx
          .update(projectDocuments)
          .set({ position: index + 1 })
          .where(eq(projectDocuments.id, row.id)),
      );
    else
      await audit.created(
        projectDocuments,
        await tx
          .insert(projectDocuments)
          .values({ projectId, fileId, position: index + 1 })
          .returning(),
      );
  }
}

async function insertRows(
  tx: Transaction,
  audit: AuditWriter,
  stageId: number,
  rows: { amountMinor: number; recipientId?: number | null; dueDate?: string | null }[],
) {
  await audit.created(
    workPlanRows,
    await tx
      .insert(workPlanRows)
      .values(
        rows.map((row) => ({
          stageId,
          amountMinor: row.amountMinor,
          recipientId: row.recipientId ?? null,
          dueDate: row.dueDate ?? null,
        })),
      )
      .returning(),
  );
}

async function applyPlanChanges(
  tx: Transaction,
  audit: AuditWriter,
  stageId: number,
  changes: ProjectWorkPlanRowChange[],
) {
  let changed = false;
  for (const change of changes) {
    if (change.id === undefined) {
      await insertRows(tx, audit, stageId, [{ ...change, amountMinor: change.amountMinor! }]);
      changed = true;
    } else if (change.delete || change.distribute) {
      if (change.distribute) await insertRows(tx, audit, stageId, change.distribute);
      await audit.mutate(workPlanRows, eq(workPlanRows.id, change.id), () =>
        tx.delete(workPlanRows).where(eq(workPlanRows.id, change.id!)),
      );
      changed = true;
    } else {
      const { id, expectedVersion: _version, delete: _delete, distribute: _distribute, ...fields } = change;
      const [current] = await tx.select().from(workPlanRows).where(eq(workPlanRows.id, id));
      if (Object.entries(fields).some(([key, value]) => current![key as keyof PlanRow] !== value)) {
        await audit.mutate(workPlanRows, eq(workPlanRows.id, id), () =>
          tx
            .update(workPlanRows)
            .set({ ...fields, version: sql`${workPlanRows.version} + 1`, updatedAt: new Date() })
            .where(eq(workPlanRows.id, id)),
        );
        changed = true;
      }
    }
  }
  return changed;
}

async function checklistMatches(
  tx: Transaction,
  checklistId: number,
  items: NonNullable<UpdateProjectStage['checklist']>['items'],
) {
  const current = await tx
    .select()
    .from(checklistItems)
    .where(and(eq(checklistItems.checklistId, checklistId), isNull(checklistItems.deletedAt)))
    .orderBy(asc(checklistItems.position), asc(checklistItems.id));
  return (
    JSON.stringify(current.map(({ title, photoHint }) => ({ title, photoHint }))) ===
    JSON.stringify(items.map(({ title, photoHint }) => ({ title, photoHint: photoHint ?? null })))
  );
}

async function applyChecklist(
  tx: Transaction,
  audit: AuditWriter,
  stageId: number,
  input: NonNullable<UpdateProjectStage['checklist']>,
) {
  const [checklist] = await tx.select().from(checklists).where(eq(checklists.stageId, stageId));
  const active = and(eq(checklistItems.checklistId, checklist!.id), isNull(checklistItems.deletedAt));
  if (await checklistMatches(tx, checklist!.id, input.items)) return false;
  await audit.mutate(checklistItems, active, () =>
    tx.update(checklistItems).set({ deletedAt: new Date() }).where(active),
  );
  await audit.created(
    checklistItems,
    await tx
      .insert(checklistItems)
      .values(
        input.items.map((item, index) => ({
          checklistId: checklist!.id,
          title: item.title,
          photoHint: item.photoHint ?? null,
          position: index + 1,
        })),
      )
      .returning(),
  );
  await audit.mutate(checklists, eq(checklists.id, checklist!.id), () =>
    tx
      .update(checklists)
      .set({ version: sql`${checklists.version} + 1`, updatedAt: new Date() })
      .where(eq(checklists.id, checklist!.id)),
  );
  return true;
}

async function createAdditional(tx: Transaction, audit: AuditWriter, projectId: number, input: CreateAdditionalStage) {
  const [stage] = await audit.created(
    stages,
    await tx
      .insert(stages)
      .values({
        projectId,
        stageTypeCode: 'additional',
        position: 9,
        assigneeId: input.assigneeId ?? null,
        status: input.assigneeId == null ? 'created' : 'assigned',
        plannedStartDate: input.plannedStartDate ?? null,
        plannedEndDate: input.plannedEndDate ?? null,
        plannedWorkAmountMinor: input.plannedWorkAmountMinor ?? null,
        plannedMaterialAmountMinor: input.plannedMaterialAmountMinor ?? null,
      })
      .returning(),
  );
  const [checklist] = await audit.created(
    checklists,
    await tx.insert(checklists).values({ stageId: stage!.id }).returning(),
  );
  await audit.created(
    checklistItems,
    await tx
      .insert(checklistItems)
      .values(
        input.checklistItems.map((item, index) => ({
          checklistId: checklist!.id,
          title: item.title,
          photoHint: item.photoHint ?? null,
          position: index + 1,
        })),
      )
      .returning(),
  );
  if (input.plannedWorkAmountMinor != null)
    await insertRows(tx, audit, stage!.id, [{ amountMinor: input.plannedWorkAmountMinor }]);
}

async function validateFinalDates(project: ProjectRow, existing: StageRow[], input: UpdateProject) {
  const changes = input.stages ?? [];
  const start = input.plannedStartDate ?? project.plannedStartDate;
  const end = input.plannedEndDate ?? project.plannedEndDate;
  if (end < start) return failure('invalid_request', 'plannedEndDate', 'Окончание проекта раньше начала.');
  const finalStages = existing.map((stage) => ({
    ...stage,
    ...stageFields(changes.find((item) => item.id === stage.id) ?? { id: stage.id, expectedVersion: stage.version }),
  }));
  for (const stage of finalStages)
    if (stage.isIncluded && !stageDatesValid(stage.plannedStartDate, stage.plannedEndDate, start, end)) {
      const index = changes.findIndex((change) => change.id === stage.id);
      return failure(
        'invalid_request',
        index < 0 ? 'plannedEndDate' : `stages.${index}.plannedEndDate`,
        'Даты включённого этапа должны находиться внутри обеих границ проекта.',
      );
    }
  if (finalStages.every((stage) => !stage.isIncluded) && !input.additionalStage)
    return failure('invalid_request', 'stages', 'Минимум один включённый этап обязателен.');
  return null;
}

async function validateAdditional(tx: Transaction, project: ProjectRow, existing: StageRow[], input: UpdateProject) {
  const start = input.plannedStartDate ?? project.plannedStartDate;
  const end = input.plannedEndDate ?? project.plannedEndDate;
  if (input.additionalStage) {
    if (existing.some((stage) => stage.stageTypeCode === 'additional'))
      return failure(
        'invalid_transition',
        'additionalStage',
        'Дополнительный этап уже существует; восстановите его по ID.',
      );
    const [type] = await tx.select().from(stageTypes).where(eq(stageTypes.code, 'additional'));
    if (
      !type?.isActive ||
      !stageDatesValid(
        input.additionalStage.plannedStartDate ?? null,
        input.additionalStage.plannedEndDate ?? null,
        start,
        end,
      ) ||
      !(await validForeman(tx, input.additionalStage.assigneeId))
    )
      return failure(
        'invalid_request',
        'additionalStage',
        'Некорректные даты, тип или назначение дополнительного этапа.',
      );
  }
  return null;
}

async function validateStageChanges(tx: Transaction, existing: StageRow[], changes: UpdateProjectStage[]) {
  const byId = new Map(existing.map((stage) => [stage.id, stage]));
  const seen = new Set<number>();
  for (const [index, change] of changes.entries()) {
    const current = byId.get(change.id);
    if (!current || seen.has(change.id))
      return failure('invalid_request', 'stages.' + index + '.id', 'Этап не принадлежит объекту или повторяется.');
    seen.add(change.id);
    const error = await validateStageChange(tx, current, change, 'stages.' + index);
    if (error) return error;
  }
  return null;
}

async function applyStageChange(tx: Transaction, audit: AuditWriter, current: StageRow, change: UpdateProjectStage) {
  const fields = stageFields(change);
  const nextAssignee = fields.assigneeId === undefined ? current.assigneeId : fields.assigneeId;
  let status = current.status;
  if (['created', 'assigned', 'supplied'].includes(status) && current.assigneeId !== nextAssignee)
    status = nextAssignee === null ? 'created' : 'assigned';
  const checklistChanged = change.checklist ? await applyChecklist(tx, audit, current.id, change.checklist) : false;
  const rowsChanged = await applyPlanChanges(tx, audit, current.id, change.workPlanRows ?? []);
  if (
    checklistChanged ||
    rowsChanged ||
    status !== current.status ||
    Object.entries(fields).some(
      ([key, value]) => JSON.stringify(current[key as keyof StageRow]) !== JSON.stringify(value),
    )
  )
    await audit.mutate(stages, eq(stages.id, current.id), () =>
      tx
        .update(stages)
        .set({ ...fields, status, version: sql`${stages.version} + 1`, updatedAt: new Date() })
        .where(eq(stages.id, current.id)),
    );
}

async function applyProjectFields(tx: Transaction, audit: AuditWriter, project: ProjectRow, input: UpdateProject) {
  const projectId = project.id;
  const {
    expectedVersion: _version,
    stages: _stages,
    additionalStage: _additional,
    documentFileIds: _documents,
    coordinates,
    ...fields
  } = input;
  const projectFields = {
    ...fields,
    ...(coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),
  };
  if (
    audit.hasEvent ||
    Object.entries(projectFields).some(
      ([key, value]) => JSON.stringify(project[key as keyof ProjectRow]) !== JSON.stringify(value),
    )
  )
    await audit.mutate(projects, eq(projects.id, projectId), () =>
      tx
        .update(projects)
        .set({ ...projectFields, version: sql`${projects.version} + 1`, updatedAt: new Date() })
        .where(eq(projects.id, projectId)),
    );
}

export async function saveProject(
  tx: Transaction,
  audit: AuditWriter,
  projectId: number,
  input: UpdateProject,
  actorId?: number | null,
): Promise<ProjectUpdateResult> {
  const [project] = await tx.select().from(projects).where(eq(projects.id, projectId)).for('update');
  if (!project) return { status: 'not_found' };
  if (project.version !== input.expectedVersion)
    return failure('version_conflict', 'expectedVersion', 'Версия объекта устарела.');
  if (project.isArchived && !(input.isArchived === false && Object.keys(input).length === 2))
    return { status: 'project_archived' };
  const existing = await tx
    .select()
    .from(stages)
    .where(eq(stages.projectId, projectId))
    .orderBy(asc(stages.id))
    .for('update');
  const changes = input.stages ?? [];
  const error =
    (await validateStageChanges(tx, existing, changes)) ??
    (await validateFinalDates(project, existing, input)) ??
    (await validateAdditional(tx, project, existing, input));
  if (error) return error;
  if (input.documentFileIds) {
    const documentError = await validateDocuments(tx, projectId, input.documentFileIds, actorId);
    if (documentError) return documentError;
  }
  // Validate the entire form before writing; locks stay held until data and audit commit together.
  for (const change of changes)
    await applyStageChange(tx, audit, existing.find((stage) => stage.id === change.id)!, change);
  if (input.additionalStage) await createAdditional(tx, audit, projectId, input.additionalStage);
  if (input.documentFileIds) await applyDocuments(tx, audit, projectId, input.documentFileIds);
  await applyProjectFields(tx, audit, project, input);
  const [updated] = await tx.select().from(projects).where(eq(projects.id, projectId));
  return { status: 'ok', value: (await loadProjects(tx, [updated!]))[0]! };
}
