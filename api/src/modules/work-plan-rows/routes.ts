import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import type { CreateWorkPlanRow, UpdateWorkPlanRow } from '#app/generated/types.gen';
import {
  zApiError,
  zCreateWorkPlanRow,
  zDeleteWorkPlanRow,
  zDistributeWorkPlanRow,
  zUpdateWorkPlanRow,
  zWorkPlanRow,
} from '#app/generated/zod.gen';
import { requestAuditContext } from '#app/modules/audit/context';
import type { WorkPlanRowRepository } from '#app/modules/work-plan-rows/repository';

function amount(value: bigint, context: z.RefinementCtx): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < 0n || value % 100n !== 0n) {
    context.addIssue({
      code: 'custom',
      path: ['amountMinor'],
      message: 'Сумма должна быть безопасным целым числом и кратна 100 копейкам.',
    });
  }
  return Number(value);
}
const create = zCreateWorkPlanRow.strict().transform(
  (body, context): CreateWorkPlanRow => ({
    amountMinor: amount(body.amountMinor, context),
    ...(body.recipientId === undefined ? {} : { recipientId: body.recipientId }),
    ...(body.dueDate === undefined ? {} : { dueDate: body.dueDate }),
  }),
);
const update = zUpdateWorkPlanRow
  .strict()
  .superRefine((body, context) => {
    if (Object.values(body).filter((value) => value !== undefined).length < 2)
      context.addIssue({ code: 'custom', message: 'Нужно передать изменяемое поле.' });
  })
  .transform(
    (body, context): UpdateWorkPlanRow => ({
      expectedVersion: body.expectedVersion,
      ...(body.amountMinor === undefined ? {} : { amountMinor: amount(body.amountMinor, context) }),
      ...(body.recipientId === undefined ? {} : { recipientId: body.recipientId }),
      ...(body.dueDate === undefined ? {} : { dueDate: body.dueDate }),
    }),
  );
const distribute = zDistributeWorkPlanRow.extend({ rows: create.array().min(2) }).strict();
const response = zWorkPlanRow.extend({ amountMinor: z.number().int().nonnegative().safe() });
const stagePath = z.object({ stageId: z.coerce.number().int().positive().max(2_147_483_647) }).strict();
const rowPath = z.object({ rowId: z.coerce.number().int().positive().max(2_147_483_647) }).strict();
const errors = { 400: zApiError, 401: zApiError, 403: zApiError, 404: zApiError, 409: zApiError };
function send(reply: FastifyReply, result: { status: string; value?: unknown }, success = 200) {
  if (result.status === 'ok') return reply.status(success).send(result.value);
  const errorsByStatus: Record<string, { status: number; error: string }> = {
    not_found: { status: 404, error: 'Not Found' },
    invalid_request: { status: 400, error: 'Bad Request' },
  };
  const { status, error } = errorsByStatus[result.status] ?? { status: 409, error: 'Conflict' };
  return reply.status(status).send({
    error,
    code: result.status,
    message: 'Операция со строкой планирования выплаты недоступна.',
  });
}
export function registerWorkPlanRowRoutes(app: FastifyInstance, repository: WorkPlanRowRepository) {
  const read = [app.authenticate, app.requireRoles('manager', 'foreman')];
  const write = [app.authenticate, app.requireRoles('manager')];
  app.get<{ Params: z.infer<typeof stagePath> }>('/stages/:stageId/work-plan-rows', {
    preHandler: read,
    schema: { params: stagePath, response: { 200: response.array(), ...errors } },
    handler: async (request, reply) => send(reply, await repository.list(request.params.stageId, request.auth!.user)),
  });
  app.get<{ Params: z.infer<typeof rowPath> }>('/work-plan-rows/:rowId', {
    preHandler: read,
    schema: { params: rowPath, response: { 200: response, ...errors } },
    handler: async (request, reply) => send(reply, await repository.get(request.params.rowId, request.auth!.user)),
  });
  app.post<{ Params: z.infer<typeof stagePath>; Body: z.infer<typeof create> }>('/stages/:stageId/work-plan-rows', {
    preHandler: write,
    schema: { params: stagePath, body: create, response: { 201: response, ...errors } },
    handler: async (request, reply) =>
      send(reply, await repository.create(request.params.stageId, request.body, requestAuditContext(request)), 201),
  });
  app.patch<{ Params: z.infer<typeof rowPath>; Body: z.infer<typeof update> }>('/work-plan-rows/:rowId', {
    preHandler: write,
    schema: { params: rowPath, body: update, response: { 200: response, ...errors } },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.mutate(request.params.rowId, request.body, 'updateWorkPlanRow', requestAuditContext(request)),
      ),
  });
  app.delete<{ Params: z.infer<typeof rowPath>; Body: z.infer<typeof zDeleteWorkPlanRow> }>('/work-plan-rows/:rowId', {
    preHandler: write,
    schema: { params: rowPath, body: zDeleteWorkPlanRow.strict(), response: { 204: z.void(), ...errors } },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.mutate(request.params.rowId, request.body, 'deleteWorkPlanRow', requestAuditContext(request)),
        204,
      ),
  });
  app.post<{ Params: z.infer<typeof rowPath>; Body: z.infer<typeof distribute> }>('/work-plan-rows/:rowId/distribute', {
    preHandler: write,
    schema: { params: rowPath, body: distribute, response: { 200: response.array(), ...errors } },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.mutate(
          request.params.rowId,
          request.body,
          'distributeWorkPlanRow',
          requestAuditContext(request),
        ),
      ),
  });
}
