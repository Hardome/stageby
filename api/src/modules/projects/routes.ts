import type { FastifyInstance } from 'fastify';
import type { z } from 'zod';

import type { RouteHandlers } from '#app/generated/fastify.gen';
import type { ApiError, CreateProject } from '#app/generated/types.gen';
import { zApiError, zCreateProjectBody, zCreateProjectResponse } from '#app/generated/zod.gen';
import { requestAuditContext } from '#app/modules/audit/context';
import type { ProjectService } from '#app/modules/projects/service';

type ParsedCreateProject = z.infer<typeof zCreateProjectBody>;
type ParsedStage = ParsedCreateProject['stages'][number];
type AddIssue = (path: Array<string | number>, message: string) => void;

function validateProjectFields(body: ParsedCreateProject, addIssue: AddIssue): void {
  if (body.ownerName.trim().length === 0) {
    addIssue(['ownerName'], 'Имя клиента не может состоять только из пробелов.');
  }
  if (body.address.trim().length === 0) {
    addIssue(['address'], 'Адрес не может состоять только из пробелов.');
  }
  if (body.plannedEndDate < body.plannedStartDate) {
    addIssue(['plannedEndDate'], 'Дата окончания проекта не может быть раньше даты начала.');
  }
  if (new Set(body.documentFileIds).size !== body.documentFileIds.length) {
    addIssue(['documentFileIds'], 'Идентификаторы файлов не должны повторяться.');
  }
}

function validateChecklistItems(stage: ParsedStage, stageIndex: number, addIssue: AddIssue): void {
  for (const [itemIndex, item] of (stage.checklistItems ?? []).entries()) {
    if (item.title.trim().length === 0) {
      addIssue(
        ['stages', stageIndex, 'checklistItems', itemIndex, 'title'],
        'Название пункта не может состоять только из пробелов.',
      );
    }
    if (typeof item.photoHint === 'string' && item.photoHint.trim().length === 0) {
      addIssue(
        ['stages', stageIndex, 'checklistItems', itemIndex, 'photoHint'],
        'Подсказка для фото не может состоять только из пробелов.',
      );
    }
  }
}

function validateStage(
  stage: ParsedStage,
  index: number,
  project: ParsedCreateProject,
  seenTypes: Set<string>,
  addIssue: AddIssue,
): void {
  if (seenTypes.has(stage.type)) {
    addIssue(['stages', index, 'type'], 'Типы этапов не должны повторяться.');
  }
  seenTypes.add(stage.type);
  if (stage.plannedEndDate < stage.plannedStartDate) {
    addIssue(['stages', index, 'plannedEndDate'], 'Дата окончания этапа не может быть раньше даты начала.');
  }
  if (stage.plannedStartDate < project.plannedStartDate || stage.plannedEndDate > project.plannedEndDate) {
    addIssue(['stages', index], 'Срок этапа должен находиться внутри срока проекта.');
  }
  for (const field of ['plannedWorkAmountMinor', 'plannedMaterialAmountMinor'] as const) {
    const amount = stage[field];
    if (amount !== null && (amount > BigInt(Number.MAX_SAFE_INTEGER) || amount % 100n !== 0n)) {
      addIssue(
        ['stages', index, field],
        'Сумма должна быть безопасным целым числом JavaScript и быть кратна 100 копейкам.',
      );
    }
  }
  validateChecklistItems(stage, index, addIssue);
}

const validatedCreateProjectBodySchema = zCreateProjectBody.superRefine((body, context) => {
  const addIssue: AddIssue = (path, message) => context.addIssue({ code: 'custom', path, message });
  validateProjectFields(body, addIssue);
  const seenTypes = new Set<string>();
  for (const [index, stage] of body.stages.entries()) {
    validateStage(stage, index, body, seenTypes, addIssue);
  }
});

const createProjectBodySchema = validatedCreateProjectBodySchema.transform((body): CreateProject => {
  const { cadastralNumber, houseDesign, contractLabel, notes, ...required } = body;
  return {
    ...required,
    ...(cadastralNumber === undefined ? {} : { cadastralNumber }),
    ...(houseDesign === undefined ? {} : { houseDesign }),
    ...(contractLabel === undefined ? {} : { contractLabel }),
    ...(notes === undefined ? {} : { notes }),
    stages: required.stages.map(({ checklistItems, ...stage }) => ({
      ...stage,
      plannedWorkAmountMinor: stage.plannedWorkAmountMinor === null ? null : Number(stage.plannedWorkAmountMinor),
      plannedMaterialAmountMinor:
        stage.plannedMaterialAmountMinor === null ? null : Number(stage.plannedMaterialAmountMinor),
      ...(checklistItems === undefined
        ? {}
        : {
            checklistItems: checklistItems.map(({ photoHint, ...item }) => ({
              ...item,
              ...(photoHint === undefined ? {} : { photoHint }),
            })),
          }),
    })),
  };
});

const errors = {
  invalid: (details: NonNullable<ApiError['details']>): ApiError => ({
    error: 'Bad Request',
    code: 'invalid_request',
    message: 'Ошибка проверки связанных данных проекта.',
    details,
  }),
} satisfies Record<string, ApiError | ((details: NonNullable<ApiError['details']>) => ApiError)>;

export function registerProjectRoutes(app: FastifyInstance, service: ProjectService): void {
  const createProject: RouteHandlers['createProject'] = async (request, reply) => {
    const result = await service.create(request.body, requestAuditContext(request));
    if (result.status === 'invalid') {
      return reply.status(400).send(errors.invalid(result.details));
    }
    return reply.status(201).send(result.project);
  };

  app.post('/projects', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      body: createProjectBodySchema,
      response: {
        201: zCreateProjectResponse,
        400: zApiError,
        401: zApiError,
        403: zApiError,
      },
    },
    handler: createProject,
  });
}
