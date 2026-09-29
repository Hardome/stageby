import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import type { ApiError } from '#app/generated/types.gen';
import {
  zAcceptStageBody,
  zAcceptStagePath,
  zApiError,
  zChangeStageStatusBody,
  zChangeStageStatusPath,
  zGetStageChecklistPath,
  zGetStageChecklistResponse,
  zReturnStageForReworkBody,
  zReturnStageForReworkPath,
  zStage,
  zUpdateChecklistItemBody,
  zUpdateChecklistItemPath,
  zUpdateChecklistItemResponse,
  zUpdateStageBody,
  zUpdateStagePath,
} from '#app/generated/zod.gen';
import type { StageRepository } from '#app/modules/stages/repository';
import type { OperationResult, StageOperationError } from '#app/modules/stages/types';

function coercePathIds(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value;
  const path = { ...value } as Record<string, unknown>;
  for (const key of ['stageId', 'itemId']) {
    if (typeof path[key] === 'string' && /^\d+$/.test(path[key])) path[key] = Number(path[key]);
  }
  return path;
}

const getStageChecklistPathSchema = z.preprocess(coercePathIds, zGetStageChecklistPath);
const updateChecklistItemPathSchema = z.preprocess(coercePathIds, zUpdateChecklistItemPath);
const updateStagePathSchema = z.preprocess(coercePathIds, zUpdateStagePath);
const changeStageStatusPathSchema = z.preprocess(coercePathIds, zChangeStageStatusPath);
const returnStageForReworkPathSchema = z.preprocess(coercePathIds, zReturnStageForReworkPath);
const acceptStagePathSchema = z.preprocess(coercePathIds, zAcceptStagePath);
const stageResponseSchema = zStage.extend({
  plannedWorkAmountMinor: z.number().int().nonnegative().nullable(),
  plannedMaterialAmountMinor: z.number().int().nonnegative().nullable(),
});

const errorDetails: Record<StageOperationError, { statusCode: 400 | 403 | 404 | 409; error: ApiError }> = {
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

export function registerStageRoutes(app: FastifyInstance, repository: StageRepository): void {
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
        ),
      ),
  });

  app.patch<{ Params: z.infer<typeof zUpdateStagePath>; Body: z.infer<typeof zUpdateStageBody> }>('/stages/:stageId', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      params: updateStagePathSchema,
      body: zUpdateStageBody,
      response: { 200: stageResponseSchema, ...errorResponses },
    },
    handler: async (request, reply) => {
      const keys = Object.keys(request.body).filter((key) => key !== 'expectedVersion');
      if (keys.length !== 1 || keys[0] !== 'assigneeId' || request.body.assigneeId === undefined) {
        return send(reply, { status: 'forbidden' });
      }
      return send(
        reply,
        await repository.assign(request.params.stageId, request.body.expectedVersion, request.body.assigneeId),
      );
    },
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
        await repository.changeStatus(request.params.stageId, request.body.expectedVersion, request.body.status),
      ),
  });

  app.post<{
    Params: z.infer<typeof zReturnStageForReworkPath>;
    Body: z.infer<typeof zReturnStageForReworkBody>;
  }>('/stages/:stageId/rework', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      params: returnStageForReworkPathSchema,
      body: zReturnStageForReworkBody,
      response: { 200: stageResponseSchema, ...errorResponses },
    },
    handler: async (request, reply) =>
      send(reply, await repository.returnForRework(request.params.stageId, request.body, request.auth!.user)),
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
        send(reply, await repository.accept(request.params.stageId, request.body, request.auth!.user)),
    },
  );
}
