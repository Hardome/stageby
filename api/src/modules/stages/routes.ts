import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import type { ApiError, ConfigureChecklist, UpdateStage } from '#app/generated/types.gen';
import {
  zAcceptStageBody,
  zAcceptStagePath,
  zApiError,
  zChangeStageStatusBody,
  zChangeStageStatusPath,
  zConfigureStageChecklistBody,
  zGetStageChecklistPath,
  zGetStageChecklistResponse,
  zGetStagePath,
  zListActiveStageTypesResponse,
  zListProjectStagesPath,
  zListStagesQuery,
  zProjectStages,
  zReturnStageForReworkBody,
  zReturnStageForReworkPath,
  zStage,
  zStagePage,
  zUpdateChecklistItemBody,
  zUpdateChecklistItemPath,
  zUpdateChecklistItemResponse,
  zUpdateStageBody,
  zUpdateStagePath,
} from '#app/generated/zod.gen';
import { requestAuditContext } from '#app/modules/audit/context';
import type { StageRepository } from '#app/modules/stages/repository';
import type { OperationResult, StageOperationError } from '#app/modules/stages/types';
import { coerceRequestValues, definedValues } from '#app/plugins/request-values';

function coercePathIds(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value;
  const path = { ...value } as Record<string, unknown>;
  for (const key of ['stageId', 'itemId']) {
    if (typeof path[key] === 'string' && /^\d+$/.test(path[key])) path[key] = Number(path[key]);
  }
  return path;
}

const getStageChecklistPathSchema = z.preprocess(coercePathIds, zGetStageChecklistPath);
const getStagePathSchema = z.preprocess(coercePathIds, zGetStagePath);
const updateChecklistItemPathSchema = z.preprocess(coercePathIds, zUpdateChecklistItemPath);
const updateStagePathSchema = z.preprocess(coercePathIds, zUpdateStagePath);
const changeStageStatusPathSchema = z.preprocess(coercePathIds, zChangeStageStatusPath);
const returnStageForReworkPathSchema = z.preprocess(coercePathIds, zReturnStageForReworkPath);
const acceptStagePathSchema = z.preprocess(coercePathIds, zAcceptStagePath);
export const stageResponseSchema = zStage.extend({
  plannedWorkAmountMinor: z.number().int().nonnegative().nullable(),
  actualWorkAmountMinor: z.number().int().nonnegative(),
  workBalanceAmountMinor: z.number().int().nullable(),
  plannedMaterialAmountMinor: z.number().int().nonnegative().nullable(),
  actualMaterialAmountMinor: z.number().int().nonnegative(),
  totalPlannedAmountMinor: z.number().int().nonnegative().nullable(),
  totalActualAmountMinor: z.number().int().nonnegative(),
});

const errorDetails: Record<StageOperationError, { statusCode: 400 | 403 | 404 | 409; error: ApiError }> = {
  assignee_required: {
    statusCode: 409,
    error: {
      error: 'Conflict',
      code: 'invalid_transition',
      message: 'Для завершения чек-листа и приёмки работ назначьте мастера этапа.',
    },
  },
  forbidden: {
    statusCode: 403,
    error: { error: 'Forbidden', code: 'forbidden', message: 'Операция недоступна для этого пользователя.' },
  },
  invalid_request: {
    statusCode: 400,
    error: { error: 'Bad Request', code: 'invalid_request', message: 'Связанные данные запроса некорректны.' },
  },
  invalid_transition: {
    statusCode: 409,
    error: { error: 'Conflict', code: 'invalid_transition', message: 'Переход из текущего состояния запрещён.' },
  },
  not_found: {
    statusCode: 404,
    error: { error: 'Not Found', code: 'not_found', message: 'Этап или вложенный ресурс не найден.' },
  },
  photo_required: {
    statusCode: 409,
    error: {
      error: 'Conflict',
      code: 'invalid_transition',
      message: 'Для выполнения пункта нужна загруженная фотография.',
    },
  },
  project_archived: {
    statusCode: 409,
    error: { error: 'Conflict', code: 'project_archived', message: 'Архивный проект нельзя изменять.' },
  },
  version_conflict: {
    statusCode: 409,
    error: { error: 'Conflict', code: 'version_conflict', message: 'Ресурс уже был изменён.' },
  },
};

function send<T>(reply: FastifyReply, result: OperationResult<T>) {
  if (result.status === 'ok') return reply.status(200).send(result.value);
  const details = errorDetails[result.status];
  return reply.status(details.statusCode).send(details.error);
}

const errorResponses = { 400: zApiError, 401: zApiError, 403: zApiError, 404: zApiError, 409: zApiError };

const updateStageBody = zUpdateStageBody
  .strict()
  .superRefine((body, context) => {
    if (Object.keys(body).length < 2)
      context.addIssue({ code: 'custom', message: 'Нужно передать хотя бы одно изменяемое поле.' });
    for (const key of ['plannedWorkAmountMinor', 'plannedMaterialAmountMinor'] as const) {
      const amount = body[key];
      if (typeof amount === 'bigint' && (amount > BigInt(Number.MAX_SAFE_INTEGER) || amount % 100n !== 0n))
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'Сумма должна быть безопасным целым числом и кратна 100 копейкам.',
        });
    }
    if (typeof body.notes === 'string' && !body.notes.trim())
      context.addIssue({ code: 'custom', path: ['notes'], message: 'Примечание не может состоять из пробелов.' });
    if (
      body.workSubtypes?.some((value) => !value.trim()) ||
      (body.workSubtypes && new Set(body.workSubtypes).size !== body.workSubtypes.length)
    )
      context.addIssue({
        code: 'custom',
        path: ['workSubtypes'],
        message: 'Подтипы должны быть непустыми и не повторяться.',
      });
  })
  .transform(
    (body): UpdateStage =>
      Object.fromEntries(
        Object.entries(body)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, typeof value === 'bigint' ? Number(value) : value]),
      ) as UpdateStage,
  );

const configureChecklistBody = zConfigureStageChecklistBody
  .strict()
  .superRefine((body, context) => {
    for (const [index, item] of body.items.entries()) {
      if (!item.title.trim())
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'title'],
          message: 'Название не может состоять из пробелов.',
        });
      if (typeof item.photoHint === 'string' && !item.photoHint.trim())
        context.addIssue({
          code: 'custom',
          path: ['items', index, 'photoHint'],
          message: 'Подсказка не может состоять из пробелов.',
        });
    }
  })
  .transform(
    (body): ConfigureChecklist => ({
      ...body,
      items: body.items.map(({ title, photoHint }) => ({ title, ...(photoHint === undefined ? {} : { photoHint }) })),
    }),
  );

export function registerStageRoutes(app: FastifyInstance, repository: StageRepository): void {
  app.get('/stage-types', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: { response: { 200: zListActiveStageTypesResponse, ...errorResponses } },
    handler: () => repository.activeTypes(),
  });
  app.get<{ Querystring: z.infer<typeof zListStagesQuery> }>('/stages', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: {
      querystring: z.preprocess(coerceRequestValues, zListStagesQuery),
      response: { 200: zStagePage.extend({ items: z.array(stageResponseSchema) }), ...errorResponses },
    },
    handler: (request) => repository.list(definedValues(request.query), request.auth!.user),
  });
  app.get<{ Params: z.infer<typeof zListProjectStagesPath> }>('/projects/:projectId/stages', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: {
      params: z.preprocess(coerceRequestValues, zListProjectStagesPath),
      response: { 200: zProjectStages.extend({ items: z.array(stageResponseSchema) }), ...errorResponses },
    },
    handler: async (request, reply) =>
      send(reply, await repository.listProject(request.params.projectId, request.auth!.user)),
  });
  app.get<{ Params: z.infer<typeof zGetStagePath> }>('/stages/:stageId', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: { params: getStagePathSchema, response: { 200: stageResponseSchema, ...errorResponses } },
    handler: async (request, reply) => send(reply, await repository.get(request.params.stageId, request.auth!.user)),
  });

  app.get<{ Params: z.infer<typeof zGetStageChecklistPath> }>('/stages/:stageId/checklist', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: { params: getStageChecklistPathSchema, response: { 200: zGetStageChecklistResponse, ...errorResponses } },
    handler: async (request, reply) =>
      send(reply, await repository.getChecklist(request.params.stageId, request.auth!.user)),
  });

  app.patch<{
    Params: z.infer<typeof zUpdateChecklistItemPath>;
    Body: z.infer<typeof zUpdateChecklistItemBody>;
  }>('/stages/:stageId/checklist/items/:itemId', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: {
      params: updateChecklistItemPathSchema,
      body: zUpdateChecklistItemBody,
      response: { 200: zUpdateChecklistItemResponse, ...errorResponses },
    },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.updateChecklistItem(
          request.params.stageId,
          request.params.itemId,
          request.body,
          request.auth!.user,
          requestAuditContext(request),
        ),
      ),
  });

  app.patch<{ Params: z.infer<typeof zUpdateStagePath>; Body: UpdateStage }>('/stages/:stageId', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      params: updateStagePathSchema,
      body: updateStageBody,
      response: { 200: stageResponseSchema, ...errorResponses },
    },
    handler: async (request, reply) =>
      send(reply, await repository.patch(request.params.stageId, request.body, requestAuditContext(request))),
  });

  app.put<{ Params: z.infer<typeof zGetStagePath>; Body: ConfigureChecklist }>('/stages/:stageId/checklist', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      params: getStagePathSchema,
      body: configureChecklistBody,
      response: { 200: zGetStageChecklistResponse, ...errorResponses },
    },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.configureChecklist(request.params.stageId, request.body, requestAuditContext(request)),
      ),
  });

  app.put<{
    Params: z.infer<typeof zChangeStageStatusPath>;
    Body: z.infer<typeof zChangeStageStatusBody>;
  }>('/stages/:stageId/status', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      params: changeStageStatusPathSchema,
      body: zChangeStageStatusBody,
      response: { 200: stageResponseSchema, ...errorResponses },
    },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.changeStatus(
          request.params.stageId,
          request.body.expectedVersion,
          request.body.status,
          requestAuditContext(request),
        ),
      ),
  });

  app.post<{
    Params: z.infer<typeof zReturnStageForReworkPath>;
    Body: z.infer<typeof zReturnStageForReworkBody>;
  }>('/stages/:stageId/rework', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      params: returnStageForReworkPathSchema,
      body: zReturnStageForReworkBody.strict().extend({ comment: z.string().trim().min(1).max(5000) }),
      response: { 200: stageResponseSchema, ...errorResponses },
    },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.returnForRework(
          request.params.stageId,
          definedValues(request.body),
          request.auth!.user,
          requestAuditContext(request),
        ),
      ),
  });

  app.post<{ Params: z.infer<typeof zAcceptStagePath>; Body: z.infer<typeof zAcceptStageBody> }>(
    '/stages/:stageId/acceptance',
    {
      preHandler: [app.authenticate, app.requireRoles('manager')],
      schema: {
        params: acceptStagePathSchema,
        body: zAcceptStageBody,
        response: { 200: stageResponseSchema, ...errorResponses },
      },
      handler: async (request, reply) =>
        send(
          reply,
          await repository.accept(
            request.params.stageId,
            request.body,
            request.auth!.user,
            requestAuditContext(request),
          ),
        ),
    },
  );
}
