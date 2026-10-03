import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import type { ApiError } from '#app/generated/types.gen';
import {
  zApiError,
  zCreateMaterialInvoiceBody,
  zCreateMaterialInvoicePath,
  zCreateMaterialInvoiceResponse,
  zCreateMaterialOrderPath,
  zCreateMaterialOrderResponse,
  zCreateMaterialShortageBody,
  zCreateMaterialShortagePath,
  zCreateMaterialShortageResponse,
  zListMaterialInvoicesPath,
  zListMaterialInvoicesResponse,
  zListMaterialOrdersPath,
  zListMaterialOrdersResponse,
  zMaterialInvoice,
  zMaterialOrder,
  zResolveMaterialShortageBody,
  zResolveMaterialShortagePath,
  zResolveMaterialShortageResponse,
  zUpdateMaterialInvoiceBody,
  zUpdateMaterialInvoicePath,
  zUpdateMaterialInvoiceResponse,
  zUpdateMaterialOrderBody,
  zUpdateMaterialOrderPath,
  zUpdateMaterialOrderResponse,
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

const errors: Record<MaterialOperationError, { statusCode: 400 | 403 | 404 | 409; error: ApiError }> = {
  forbidden: {
    statusCode: 403,
    error: { error: 'Forbidden', code: 'forbidden', message: 'Операция запрещена для этой роли.' },
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
const invoiceResponse = zMaterialInvoice.extend({ amountMinor: z.number().int().positive() });
const orderResponse = zMaterialOrder.extend({ invoices: z.array(invoiceResponse) });
const invoiceBody = zCreateMaterialInvoiceBody
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
  app.get('/stages/:stageId/material-orders', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: {
      params: pathId('stageId', zListMaterialOrdersPath),
      response: { 200: z.array(orderResponse), ...responses },
    },
    handler: async (request, reply) =>
      send(reply, await repository.listOrders((request.params as { stageId: number }).stageId, request.auth!.user)),
  });
  app.post('/stages/:stageId/material-orders', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: { params: pathId('stageId', zCreateMaterialOrderPath), response: { 201: orderResponse, ...responses } },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.createOrder(
          (request.params as { stageId: number }).stageId,
          request.auth!.user,
          requestAuditContext(request),
        ),
        201,
      ),
  });
  app.patch('/material-orders/:orderId', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      params: pathId('orderId', zUpdateMaterialOrderPath),
      body: zUpdateMaterialOrderBody,
      response: { 200: orderResponse, ...responses },
    },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.updateOrder(
          (request.params as { orderId: number }).orderId,
          request.body as z.infer<typeof zUpdateMaterialOrderBody>,
          request.auth!.user,
          requestAuditContext(request),
        ),
      ),
  });
  app.get('/material-orders/:orderId/invoices', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: {
      params: pathId('orderId', zListMaterialInvoicesPath),
      response: { 200: z.array(invoiceResponse), ...responses },
    },
    handler: async (request, reply) =>
      send(reply, await repository.listInvoices((request.params as { orderId: number }).orderId, request.auth!.user)),
  });
  app.post('/material-orders/:orderId/invoices', {
    preHandler: [app.authenticate, app.requireRoles('manager')],
    schema: {
      params: pathId('orderId', zCreateMaterialInvoicePath),
      body: invoiceBody,
      response: { 201: invoiceResponse, ...responses },
    },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.createInvoice(
          (request.params as { orderId: number }).orderId,
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
      body: zUpdateMaterialInvoiceBody,
      response: { 200: invoiceResponse, ...responses },
    },
    handler: async (request, reply) => {
      const body = request.body as z.infer<typeof zUpdateMaterialInvoiceBody>;
      const input = {
        expectedVersion: body.expectedVersion,
        ...(body.isPaid === undefined ? {} : { isPaid: body.isPaid }),
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
