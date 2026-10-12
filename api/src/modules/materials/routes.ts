import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import type { ApiError, UpdateMaterialInvoice } from '#app/generated/types.gen';
import {
  zApiError,
  zCreateMaterialShortageBody,
  zCreateMaterialShortagePath,
  zCreateMaterialShortageResponse,
  zCreateStageMaterialInvoiceBody,
  zCreateStageMaterialInvoicePath,
  zCreateStageMaterialInvoiceResponse,
  zListStageMaterialInvoicesPath,
  zResolveMaterialShortageBody,
  zResolveMaterialShortagePath,
  zResolveMaterialShortageResponse,
  zStageMaterialInvoice,
  zUpdateMaterialInvoiceBody,
  zUpdateMaterialInvoicePath,
  zUpdateMaterialInvoiceResponse,
} from '#app/generated/zod.gen';
import { requestAuditContext } from '#app/modules/audit/context';
import type { MaterialRepository } from '#app/modules/materials/repository';
import type { MaterialOperationError, MaterialOperationResult } from '#app/modules/materials/types';

function pathId(key: string, schema: z.ZodType) {
  return z.preprocess((value) => {
    if (typeof value !== 'object' || value === null) return value;
    const copy = { ...value } as Record<string, unknown>;
    if (typeof copy[key] === 'string' && /^\d+$/.test(copy[key])) copy[key] = Number(copy[key]);
    return copy;
  }, schema);
}

const errors: Record<MaterialOperationError, { statusCode: 400 | 403 | 404 | 409 | 413; error: ApiError }> = {
  forbidden: {
    statusCode: 403,
    error: { error: 'Forbidden', code: 'forbidden', message: 'Операция запрещена для этой роли.' },
  },
  file_too_large: {
    statusCode: 413,
    error: { error: 'Payload Too Large', code: 'file_too_large', message: 'Файл счёта превышает 10 МиБ.' },
  },
  invoice_limit_exceeded: {
    statusCode: 409,
    error: {
      error: 'Conflict',
      code: 'invoice_limit_exceeded',
      message: 'На этапе уже создано максимально допустимое количество счетов.',
    },
  },
  invalid_request: {
    statusCode: 400,
    error: { error: 'Bad Request', code: 'invalid_request', message: 'Связанный файл или данные счёта недопустимы.' },
  },
  invalid_transition: {
    statusCode: 409,
    error: { error: 'Conflict', code: 'invalid_transition', message: 'Операция недоступна в текущем состоянии.' },
  },
  not_found: { statusCode: 404, error: { error: 'Not Found', code: 'not_found', message: 'Ресурс не найден.' } },
  project_archived: {
    statusCode: 409,
    error: { error: 'Conflict', code: 'project_archived', message: 'Архивный проект нельзя изменять.' },
  },
  version_conflict: {
    statusCode: 409,
    error: { error: 'Conflict', code: 'version_conflict', message: 'Ресурс уже был изменён.' },
  },
};

function send<T>(reply: FastifyReply, result: MaterialOperationResult<T>, status = 200) {
  if (result.status === 'ok') return reply.status(status).send(result.value);
  const detail = errors[result.status];
  return reply.status(detail.statusCode).send(detail.error);
}

const responses = { 400: zApiError, 401: zApiError, 403: zApiError, 404: zApiError, 409: zApiError };
const invoiceResponse = zStageMaterialInvoice.extend({
  amountMinor: z.number().int().positive(),
  paidAmountMinor: z.number().int().positive().nullable(),
});
const updateInvoiceBody = zUpdateMaterialInvoiceBody
  .strict()
  .superRefine((body, context) => {
    if (
      body.paidAmountMinor !== undefined &&
      (body.paidAmountMinor > BigInt(Number.MAX_SAFE_INTEGER) || body.paidAmountMinor % 100n !== 0n)
    )
      context.addIssue({
        code: 'custom',
        path: ['paidAmountMinor'],
        message: 'Сумма должна быть безопасным целым числом и кратна 100 копейкам.',
      });
    if (body.isPaid === true && (body.paidAmountMinor === undefined || body.paidDate === undefined))
      context.addIssue({ code: 'custom', message: 'Для оплаты обязательны фактическая сумма и дата.' });
    if (body.isPaid !== true && (body.paidAmountMinor !== undefined || body.paidDate !== undefined))
      context.addIssue({ code: 'custom', message: 'Сумма и дата передаются вместе с отметкой оплаты.' });
    if (Object.values(body).filter((value) => value !== undefined).length < 2)
      context.addIssue({ code: 'custom', message: 'Нужно передать изменяемое поле.' });
  })
  .transform(
    (body): UpdateMaterialInvoice => ({
      expectedVersion: body.expectedVersion,
      ...(body.isPaid === undefined ? {} : { isPaid: body.isPaid }),
      ...(body.isDelivered === undefined ? {} : { isDelivered: body.isDelivered }),
      ...(body.paidAmountMinor === undefined ? {} : { paidAmountMinor: Number(body.paidAmountMinor) }),
      ...(body.paidDate === undefined ? {} : { paidDate: body.paidDate }),
    }),
  );
const invoiceBody = zCreateStageMaterialInvoiceBody
  .superRefine((body, context) => {
    if (body.amountMinor > BigInt(Number.MAX_SAFE_INTEGER)) {
      context.addIssue({
        code: 'custom',
        path: ['amountMinor'],
        message: 'Сумма превышает безопасное целое число JavaScript.',
      });
    }
  })
  .transform((body) => ({
    fileId: body.fileId,
    amountMinor: Number(body.amountMinor),
    ...(body.supplierName === undefined
      ? {}
      : { supplierName: typeof body.supplierName === 'string' ? body.supplierName.trim() : null }),
  }));
const shortageBody = zCreateMaterialShortageBody.transform((body) => ({ comment: body.comment.trim() }));
const resolutionBody = zResolveMaterialShortageBody.transform((body) => ({
  expectedVersion: body.expectedVersion,
  ...(body.resolutionComment === undefined
    ? {}
    : { resolutionComment: typeof body.resolutionComment === 'string' ? body.resolutionComment.trim() : null }),
}));

export function registerMaterialRoutes(app: FastifyInstance, repository: MaterialRepository): void {
  app.get('/stages/:stageId/material-invoices', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: {
      params: pathId('stageId', zListStageMaterialInvoicesPath),
      response: { 200: z.array(invoiceResponse).max(10), ...responses },
    },
    handler: async (request, reply) =>
      send(reply, await repository.listInvoices((request.params as { stageId: number }).stageId, request.auth!.user)),
  });
  app.post('/stages/:stageId/material-invoices', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      params: pathId('stageId', zCreateStageMaterialInvoicePath),
      body: invoiceBody,
      response: { 201: invoiceResponse, ...responses, 413: zApiError },
    },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.createInvoice(
          (request.params as { stageId: number }).stageId,
          request.body as z.infer<typeof invoiceBody>,
          requestAuditContext(request),
        ),
        201,
      ),
  });
  app.patch('/material-invoices/:invoiceId', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: {
      params: pathId('invoiceId', zUpdateMaterialInvoicePath),
      body: updateInvoiceBody,
      response: { 200: invoiceResponse, ...responses },
    },
    handler: async (request, reply) => {
      const body = request.body as z.infer<typeof updateInvoiceBody>;
      const input = {
        expectedVersion: body.expectedVersion,
        ...(body.isPaid === undefined ? {} : { isPaid: body.isPaid }),
        ...(body.paidAmountMinor === undefined ? {} : { paidAmountMinor: body.paidAmountMinor }),
        ...(body.paidDate === undefined ? {} : { paidDate: body.paidDate }),
        ...(body.isDelivered === undefined ? {} : { isDelivered: body.isDelivered }),
      };
      return send(
        reply,
        await repository.updateInvoice(
          (request.params as { invoiceId: number }).invoiceId,
          input,
          request.auth!.user,
          requestAuditContext(request),
        ),
      );
    },
  });
  app.post('/material-invoices/:invoiceId/shortages', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: {
      params: pathId('invoiceId', zCreateMaterialShortagePath),
      body: shortageBody,
      response: { 201: zCreateMaterialShortageResponse, ...responses },
    },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.createShortage(
          (request.params as { invoiceId: number }).invoiceId,
          (request.body as z.infer<typeof shortageBody>).comment,
          request.auth!.user,
          requestAuditContext(request),
        ),
        201,
      ),
  });
  app.post('/material-shortages/:shortageId/resolution', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      params: pathId('shortageId', zResolveMaterialShortagePath),
      body: resolutionBody,
      response: { 200: zResolveMaterialShortageResponse, ...responses },
    },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.resolveShortage(
          (request.params as { shortageId: number }).shortageId,
          request.body as z.infer<typeof resolutionBody>,
          request.auth!.user,
          requestAuditContext(request),
        ),
      ),
  });
}
