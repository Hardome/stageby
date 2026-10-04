import { and, asc, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { checklistItems, checklists, checklistTemplateItems, checklistTemplates } from '#app/db/schema/checklists';
import { files, projectDocuments } from '#app/db/schema/files';
import type * as databaseSchema from '#app/db/schema/index';
import { projects } from '#app/db/schema/projects';
import { stageTypes } from '#app/db/schema/stage-types';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import type { CreateProject, Project } from '#app/generated/types.gen';
import type { AuditContext } from '#app/modules/audit/context';
import { type AuditWriter, auditedTransaction } from '#app/modules/audit/repository';
import { toProject } from '#app/modules/projects/mapper';

type Database = NodePgDatabase<typeof databaseSchema>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type CreateProjectStage = CreateProject['stages'][number];

export interface ValidationDetail {
  path: string;
  message: string;
}

export type CreateProjectResult =
  | { status: 'created'; project: Project }
  | { status: 'invalid'; details: ValidationDetail[] };

async function loadStageTypes(transaction: Transaction, input: CreateProject) {
  const selectedTypes = await transaction
    .select()
    .from(stageTypes)
    .where(
      inArray(
        stageTypes.code,
        input.stages.map((stage) => stage.type),
      ),
    )
    .orderBy(asc(stageTypes.position));
  const typeByCode = new Map(selectedTypes.map((stageType) => [stageType.code, stageType]));
  const details = input.stages.flatMap((stage, index): ValidationDetail[] =>
    typeByCode.get(stage.type)?.isActive
      ? []
      : [{ path: `body.stages.${index}.type`, message: 'Тип этапа отсутствует или неактивен.' }],
  );
  return { typeByCode, details };
}

async function validateAssignees(transaction: Transaction, input: CreateProject): Promise<ValidationDetail[]> {
  const assigneeIds = [
    ...new Set(input.stages.flatMap((stage) => (stage.assigneeId === null ? [] : [stage.assigneeId]))),
  ];
  const assignees =
    assigneeIds.length === 0 ? [] : await transaction.select().from(users).where(inArray(users.id, assigneeIds));
  const assigneeById = new Map(assignees.map((user) => [user.id, user]));
  return input.stages.flatMap((stage, index): ValidationDetail[] => {
    const assignee = stage.assigneeId === null ? undefined : assigneeById.get(stage.assigneeId);
    return stage.assigneeId === null || (assignee?.role === 'foreman' && assignee.isActive)
      ? []
      : [
          {
            path: `body.stages.${index}.assigneeId`,
            message: 'Назначить можно только активного пользователя с ролью foreman.',
          },
        ];
  });
}

async function validateDocuments(transaction: Transaction, input: CreateProject): Promise<ValidationDetail[]> {
  if (input.documentFileIds.length === 0) return [];
  const selectedFiles = await transaction.select().from(files).where(inArray(files.id, input.documentFileIds));
  const existingDocuments = await transaction
    .select({ fileId: projectDocuments.fileId })
    .from(projectDocuments)
    .where(inArray(projectDocuments.fileId, input.documentFileIds));
  const alreadyAttached = new Set(existingDocuments.map(({ fileId }) => fileId));
  const fileById = new Map(selectedFiles.map((file) => [file.id, file]));
  return input.documentFileIds.flatMap((fileId, index): ValidationDetail[] => {
    const file = fileById.get(fileId);
    return file?.status === 'uploaded' && file.purpose === 'project_document' && !alreadyAttached.has(fileId)
      ? []
      : [
          {
            path: `body.documentFileIds.${index}`,
            message: 'Файл отсутствует, не загружен или не является PDF-документом проекта.',
          },
        ];
  });
}

async function loadTemplates(transaction: Transaction, input: CreateProject) {
  const stagesUsingTemplate = input.stages.filter((stage) => stage.checklistItems === undefined);
  const templates =
    stagesUsingTemplate.length === 0
      ? []
      : await transaction
          .select()
          .from(checklistTemplates)
          .where(
            and(
              inArray(
                checklistTemplates.stageTypeCode,
                stagesUsingTemplate.map((stage) => stage.type),
              ),
              eq(checklistTemplates.isActive, true),
            ),
          );
  const templateByType = new Map(templates.map((template) => [template.stageTypeCode, template]));
  const templateIds = templates.map((template) => template.id);
  const templateItems =
    templateIds.length === 0
      ? []
      : await transaction
          .select()
          .from(checklistTemplateItems)
          .where(inArray(checklistTemplateItems.checklistTemplateId, templateIds))
          .orderBy(asc(checklistTemplateItems.position));
  const templateItemsById = Map.groupBy(templateItems, (item) => item.checklistTemplateId);
  const details = input.stages.flatMap((stage, index): ValidationDetail[] => {
    const template = templateByType.get(stage.type);
    return stage.checklistItems !== undefined || (template && (templateItemsById.get(template.id)?.length ?? 0) > 0)
      ? []
      : [
          {
            path: `body.stages.${index}.checklistItems`,
            message: 'Для типа этапа нет непустого активного шаблона чек-листа.',
          },
        ];
  });
  return { templateByType, templateItemsById, details };
}

async function insertProject(transaction: Transaction, input: CreateProject, audit: AuditWriter) {
  const [project] = await audit.created(
    projects,
    await transaction
      .insert(projects)
      .values({
        ownerName: input.ownerName,
        address: input.address,
        latitude: input.coordinates.latitude,
        longitude: input.coordinates.longitude,
        cadastralNumber: input.cadastralNumber,
        houseDesign: input.houseDesign,
        contractLabel: input.contractLabel,
        plannedStartDate: input.plannedStartDate,
        plannedEndDate: input.plannedEndDate,
        notes: input.notes,
      })
      .returning(),
  );
  if (!project) {
    throw new Error('Не удалось создать проект');
  }
  return project;
}

async function insertStage(
  transaction: Transaction,
  projectId: number,
  stageInput: CreateProjectStage,
  position: number,
  audit: AuditWriter,
) {
  const [stage] = await audit.created(
    stages,
    await transaction
      .insert(stages)
      .values({
        projectId,
        stageTypeCode: stageInput.type,
        position,
        assigneeId: stageInput.assigneeId,
        status: stageInput.assigneeId === null ? 'created' : 'assigned',
        plannedStartDate: stageInput.plannedStartDate,
        plannedEndDate: stageInput.plannedEndDate,
        plannedWorkAmountMinor: stageInput.plannedWorkAmountMinor,
        plannedMaterialAmountMinor: stageInput.plannedMaterialAmountMinor,
      })
      .returning(),
  );
  if (!stage) {
    throw new Error('Не удалось создать этап');
  }
  return stage;
}

async function insertChecklist(
  transaction: Transaction,
  stageId: number,
  items: ReadonlyArray<{ title: string; photoHint?: string | null }>,
  audit: AuditWriter,
) {
  const [checklist] = await audit.created(
    checklists,
    await transaction.insert(checklists).values({ stageId }).returning(),
  );
  if (!checklist) {
    throw new Error('Не удалось создать чек-лист');
  }
  await audit.created(
    checklistItems,
    await transaction
      .insert(checklistItems)
      .values(
        items.map((item, index) => ({
          checklistId: checklist.id,
          title: item.title,
          photoHint: item.photoHint,
          position: index + 1,
        })),
      )
      .returning(),
  );
}

export class ProjectRepository {
  readonly #database: Database;

  constructor(database: Database) {
    this.#database = database;
  }

  createAtomically(input: CreateProject, context: AuditContext = { source: 'system' }): Promise<CreateProjectResult> {
    return auditedTransaction(this.#database, context, 'createProject', async (transaction, audit) => {
      const typeData = await loadStageTypes(transaction, input);
      const assigneeDetails = await validateAssignees(transaction, input);
      const documentDetails = await validateDocuments(transaction, input);
      const templateData = await loadTemplates(transaction, input);
      const details = [...typeData.details, ...assigneeDetails, ...documentDetails, ...templateData.details];

      if (details.length > 0) {
        return { status: 'invalid', details };
      }

      const project = await insertProject(transaction, input, audit);

      if (input.documentFileIds.length > 0) {
        await audit.created(
          projectDocuments,
          await transaction
            .insert(projectDocuments)
            .values(
              input.documentFileIds.map((fileId, index) => ({
                projectId: project.id,
                fileId,
                position: index + 1,
              })),
            )
            .returning(),
        );
      }

      for (const stageInput of input.stages) {
        const stageType = typeData.typeByCode.get(stageInput.type);
        if (!stageType) {
          throw new Error('Тип этапа не найден после проверки');
        }
        const stage = await insertStage(transaction, project.id, stageInput, stageType.position, audit);
        const template = templateData.templateByType.get(stageInput.type);
        const items =
          stageInput.checklistItems ?? (template ? (templateData.templateItemsById.get(template.id) ?? []) : []);
        await insertChecklist(transaction, stage.id, items, audit);
      }

      const response = toProject(project);
      return { status: 'created', project: response };
    });
  }
}
