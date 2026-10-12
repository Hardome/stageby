import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { RouteHandlers } from '#app/generated/fastify.gen';
import type { ApiError, CreateProject } from '#app/generated/types.gen';
import {
  zApiError,
  zCreateProjectBody,
  zCreateProjectHeaders,
  zCreateProjectStage,
  zGetProjectPath,
  zListProjectsQuery,
  zProject,
  zProjectFinancialSummary,
  zProjectPage,
  zUpdateProjectBody,
} from '#app/generated/zod.gen';
import { requestAuditContext } from '#app/modules/audit/context';
import type { ProjectService } from '#app/modules/projects/service';
import { coerceRequestValues, definedValues } from '#app/plugins/request-values';

const projectResponse = zProject.extend({
  finances: zProjectFinancialSummary.extend({
    plannedWorkAmountMinor: z.number().int().nonnegative().nullable(),
    actualWorkAmountMinor: z.number().int().nonnegative(),
    plannedMaterialAmountMinor: z.number().int().nonnegative().nullable(),
    actualMaterialAmountMinor: z.number().int().nonnegative(),
    totalPlannedAmountMinor: z.number().int().nonnegative().nullable(),
    totalActualAmountMinor: z.number().int().nonnegative(),
  }),
});
const projectPath = z.preprocess(coerceRequestValues, zGetProjectPath);
const projectQuery = z.preprocess(coerceRequestValues, zListProjectsQuery);
const updateProjectBody = zUpdateProjectBody.strict().superRefine((body, context) => {
  if (Object.keys(body).length === 0)
    context.addIssue({ code: 'custom', message: 'Нужно передать хотя бы одно поле.' });
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string' && !value.trim())
      context.addIssue({ code: 'custom', path: [key], message: 'Поле не может состоять из пробелов.' });
  }
});
const errorResponses = { 400: zApiError, 401: zApiError, 403: zApiError, 404: zApiError, 409: zApiError };

function projectError(status: 'not_found' | 'invalid_request' | 'idempotency_conflict'): ApiError {
  const errors = { not_found: 'Not Found', invalid_request: 'Bad Request', idempotency_conflict: 'Conflict' };
  return {
    error: errors[status],
    code: status,
    message: status === 'not_found' ? 'Объект не найден.' : 'Связанные данные запроса некорректны.',
  };
}

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
  for (const key of ['cadastralNumber', 'houseDesign', 'contractLabel', 'notes'] as const) {
    if (typeof body[key] === 'string' && !body[key].trim())
      addIssue([key], 'Поле не может состоять только из пробелов.');
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
  if (stage.type === 'additional')
    addIssue(['stages', index, 'type'], 'Дополнительный этап доступен только при редактировании объекта.');
  for (const field of ['plannedStartDate', 'plannedEndDate'] as const) {
    const date = stage[field];
    if (date != null && (date < project.plannedStartDate || date > project.plannedEndDate)) {
      addIssue(['stages', index, field], 'Дата этапа должна находиться внутри срока проекта.');
    }
  }
  if (stage.plannedStartDate != null && stage.plannedEndDate != null && stage.plannedEndDate < stage.plannedStartDate) {
    addIssue(['stages', index, 'plannedEndDate'], 'Дата окончания этапа не может быть раньше даты начала.');
  }
  for (const field of ['plannedWorkAmountMinor', 'plannedMaterialAmountMinor'] as const) {
    const amount = stage[field];
    if (amount != null && (amount > BigInt(Number.MAX_SAFE_INTEGER) || amount % 100n !== 0n)) {
      addIssue(
        ['stages', index, field],
        'Сумма должна быть безопасным целым числом JavaScript и быть кратна 100 копейкам.',
      );
    }
  }
  validateChecklistItems(stage, index, addIssue);
}

const validatedCreateProjectBodySchema = zCreateProjectBody
  .extend({
    stages: zCreateProjectBody.shape.stages.element
      .strict()
      .extend({
        checklistItems: zCreateProjectStage.shape.checklistItems.unwrap().element.strict().array().min(1).optional(),
      })
      .array()
      .min(1)
      .max(8),
  })
  .strict()
  .superRefine((body, context) => {
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
      assigneeId: stage.assigneeId ?? null,
      plannedStartDate: stage.plannedStartDate ?? null,
      plannedEndDate: stage.plannedEndDate ?? null,
      plannedWorkAmountMinor: stage.plannedWorkAmountMinor == null ? null : Number(stage.plannedWorkAmountMinor),
      plannedMaterialAmountMinor:
        stage.plannedMaterialAmountMinor == null ? null : Number(stage.plannedMaterialAmountMinor),
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
  app.get<{ Querystring: z.infer<typeof zListProjectsQuery> }>('/projects', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      querystring: projectQuery,
      response: { 200: zProjectPage.extend({ items: z.array(projectResponse) }), ...errorResponses },
    },
    handler: (request) => service.list(definedValues(request.query)),
  });
  app.get<{ Params: z.infer<typeof zGetProjectPath> }>('/projects/:projectId', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: { params: projectPath, response: { 200: projectResponse, ...errorResponses } },
    handler: async (request, reply) => {
      const result = await service.get(request.params.projectId);
      return result.status === 'ok' ? result.value : reply.status(404).send(projectError('not_found'));
    },
  });
  app.patch<{ Params: z.infer<typeof zGetProjectPath>; Body: z.infer<typeof zUpdateProjectBody> }>(
    '/projects/:projectId',
    {
      preHandler: [app.authenticate, app.requireRoles('manager')],
      schema: { params: projectPath, body: updateProjectBody, response: { 200: projectResponse, ...errorResponses } },
      handler: async (request, reply) => {
        const input = Object.fromEntries(Object.entries(request.body).filter(([, value]) => value !== undefined));
        const result = await service.update(request.params.projectId, input, requestAuditContext(request));
        if (result.status === 'ok') return result.value;
        const status = result.status === 'not_found' ? 'not_found' : 'invalid_request';
        return reply.status(status === 'not_found' ? 404 : 400).send(projectError(status));
      },
    },
  );
  const createProject: RouteHandlers['createProject'] = async (request, reply) => {
    const result = await service.create(
      request.body,
      request.headers['idempotency-key'] as string,
      requestAuditContext(request),
    );
    if (result.status === 'idempotency_conflict') return reply.status(409).send(projectError(result.status));
    if (result.status === 'invalid') {
      return reply.status(400).send(errors.invalid(result.details));
    }
    return reply.status(201).send(result.project);
  };

  app.post('/projects', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      body: createProjectBodySchema,
      headers: z.object({ 'idempotency-key': zCreateProjectHeaders.shape['Idempotency-Key'] }).passthrough(),
      response: {
        201: projectResponse,
        400: zApiError,
        401: zApiError,
        403: zApiError,
        409: zApiError,
      },
    },
    handler: createProject,
  });
}
