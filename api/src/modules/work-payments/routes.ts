import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import type { ApiError, CreateWorkPayment, UpdateWorkPayment } from '#app/generated/types.gen';
import {
  zApiError,
  zCreateWorkPaymentBody,
  zCreateWorkPaymentPath,
  zDeleteWorkPaymentBody,
  zDeleteWorkPaymentPath,
  zListWorkPaymentsPath,
  zUpdateWorkPaymentBody,
  zUpdateWorkPaymentPath,
  zWorkPayment,
} from '#app/generated/zod.gen';
import { requestAuditContext } from '#app/modules/audit/context';
import type { WorkPaymentRepository } from '#app/modules/work-payments/repository';
import type { WorkPaymentOperationError, WorkPaymentOperationResult } from '#app/modules/work-payments/types';

function coercePathId(key: string, schema: z.ZodType) {
  return z.preprocess((value) => {
    if (typeof value !== 'object' || value === null) return value;
    const path = { ...value } as Record<string, unknown>;
    if (typeof path[key] === 'string' && /^\d+$/.test(path[key])) path[key] = Number(path[key]);
    return path;
  }, schema);
}

const listPathSchema = coercePathId('stageId', zListWorkPaymentsPath);
const createPathSchema = coercePathId('stageId', zCreateWorkPaymentPath);
const updatePathSchema = coercePathId('paymentId', zUpdateWorkPaymentPath);
const deletePathSchema = coercePathId('paymentId', zDeleteWorkPaymentPath);
const workPaymentResponseSchema = zWorkPayment.extend({ amountMinor: z.number().int().positive().safe() });

function validateAmountAndComment(
  body: { amountMinor?: bigint | undefined; comment?: string | null | undefined },
  context: z.RefinementCtx,
): void {
  if (body.amountMinor !== undefined) {
    if (body.amountMinor > BigInt(Number.MAX_SAFE_INTEGER)) {
      context.addIssue({ code: 'custom', path: ['amountMinor'], message: 'Сумма превышает безопасное целое число.' });
    }
    if (body.amountMinor % 100n !== 0n) {
      context.addIssue({ code: 'custom', path: ['amountMinor'], message: 'Сумма должна быть кратна 100 копейкам.' });
    }
  }
  if (typeof body.comment === 'string' && body.comment.trim().length === 0) {
    context.addIssue({ code: 'custom', path: ['comment'], message: 'Комментарий не может быть пустым.' });
  }
}

const createBodySchema = zCreateWorkPaymentBody
  .strict()
  .superRefine(validateAmountAndComment)
  .transform(
    (body): CreateWorkPayment => ({
      paidAt: body.paidAt,
      amountMinor: Number(body.amountMinor),
      ...(body.comment === undefined ? {} : { comment: typeof body.comment === 'string' ? body.comment.trim() : null }),
    }),
  );

const updateBodySchema = zUpdateWorkPaymentBody
  .strict()
  .superRefine((body, context) => {
    validateAmountAndComment(body, context);
    if (body.paidAt === undefined && body.amountMinor === undefined && body.comment === undefined) {
      context.addIssue({ code: 'custom', message: 'Нужно передать хотя бы одно изменяемое поле.' });
    }
  })
  .transform(
    (body): UpdateWorkPayment => ({
      expectedVersion: body.expectedVersion,
      ...(body.paidAt === undefined ? {} : { paidAt: body.paidAt }),
      ...(body.amountMinor === undefined ? {} : { amountMinor: Number(body.amountMinor) }),
      ...(body.comment === undefined ? {} : { comment: typeof body.comment === 'string' ? body.comment.trim() : null }),
    }),
  );

const errorDetails: Record<WorkPaymentOperationError, { statusCode: 400 | 404 | 409; error: ApiError }> = {
  invalid_request: {
    statusCode: 400,
    error: { error: 'Bad Request', code: 'invalid_request', message: 'Получателем должен быть активный мастер.' },
  },
  not_found: {
    statusCode: 404,
    error: { error: 'Not Found', code: 'not_found', message: 'Этап или платёж не найден.' },
  },
  project_archived: {
    statusCode: 409,
    error: { error: 'Conflict', code: 'project_archived', message: 'Архивный проект нельзя изменять.' },
  },
  version_conflict: {
    statusCode: 409,
    error: { error: 'Conflict', code: 'version_conflict', message: 'Платёж уже был изменён.' },
  },
};

function send<T>(reply: FastifyReply, result: WorkPaymentOperationResult<T>, successStatus = 200) {
  if (result.status === 'ok') return reply.status(successStatus).send(result.value);
  const detail = errorDetails[result.status];
  return reply.status(detail.statusCode).send(detail.error);
}

const errorResponses = { 400: zApiError, 401: zApiError, 403: zApiError, 404: zApiError, 409: zApiError };

export function registerWorkPaymentRoutes(app: FastifyInstance, repository: WorkPaymentRepository): void {
  app.get<{ Params: z.infer<typeof zListWorkPaymentsPath> }>('/stages/:stageId/work-payments', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: { params: listPathSchema, response: { 200: z.array(workPaymentResponseSchema), ...errorResponses } },
    handler: async (request, reply) => send(reply, await repository.list(request.params.stageId, request.auth!.user)),
  });

  app.post<{
    Params: z.infer<typeof zCreateWorkPaymentPath>;
    Body: z.infer<typeof createBodySchema>;
  }>('/stages/:stageId/work-payments', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      params: createPathSchema,
      body: createBodySchema,
      response: { 201: workPaymentResponseSchema, ...errorResponses },
    },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.create(
          request.params.stageId,
          request.body,
          request.auth!.user.id,
          requestAuditContext(request),
        ),
        201,
      ),
  });

  app.patch<{
    Params: z.infer<typeof zUpdateWorkPaymentPath>;
    Body: z.infer<typeof updateBodySchema>;
  }>('/work-payments/:paymentId', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      params: updatePathSchema,
      body: updateBodySchema,
      response: { 200: workPaymentResponseSchema, ...errorResponses },
    },
    handler: async (request, reply) =>
      send(reply, await repository.update(request.params.paymentId, request.body, requestAuditContext(request))),
  });

  app.delete<{
    Params: z.infer<typeof zDeleteWorkPaymentPath>;
    Body: z.infer<typeof zDeleteWorkPaymentBody>;
  }>('/work-payments/:paymentId', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      params: deletePathSchema,
      body: zDeleteWorkPaymentBody,
      response: { 204: z.void(), ...errorResponses },
    },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.delete(request.params.paymentId, request.body.expectedVersion, requestAuditContext(request)),
        204,
      ),
  });
}
