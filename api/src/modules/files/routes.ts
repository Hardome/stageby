import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import type { ApiError } from '#app/generated/types.gen';
import {
  zApiError,
  zCompleteFileUploadBody,
  zCompleteFileUploadPath,
  zCompleteFileUploadResponse,
  zCreateChecklistItemPhotoBody,
  zCreateChecklistItemPhotoPath,
  zCreateChecklistItemPhotoResponse,
  zCreateFileUploadBody,
  zCreateFileUploadResponse,
  zDeleteChecklistItemPhotoPath,
  zGetFileContentPath,
  zGetFileContentResponse,
  zListChecklistItemPhotosPath,
  zListChecklistItemPhotosResponse,
} from '#app/generated/zod.gen';
import { requestAuditContext } from '#app/modules/audit/context';
import type { FileRepository } from '#app/modules/files/repository';
import type { FileOperationError, FileOperationResult } from '#app/modules/files/types';

function coercePathId(key: string, schema: z.ZodType) {
  return z.preprocess((value) => {
    if (typeof value !== 'object' || value === null) return value;
    const path = { ...value } as Record<string, unknown>;
    if (typeof path[key] === 'string' && /^\d+$/.test(path[key])) path[key] = Number(path[key]);
    return path;
  }, schema);
}

const completePathSchema = coercePathId('uploadId', zCompleteFileUploadPath);
const filePathSchema = coercePathId('fileId', zGetFileContentPath);
const listPhotosPathSchema = coercePathId('itemId', zListChecklistItemPhotosPath);
const createPhotoPathSchema = coercePathId('itemId', zCreateChecklistItemPhotoPath);
const deletePhotoPathSchema = coercePathId('photoId', zDeleteChecklistItemPhotoPath);
const idempotencyHeadersSchema = z.object({ 'idempotency-key': z.string().min(16).max(100) }).passthrough();
const createUploadBodySchema = zCreateFileUploadBody
  .superRefine((body, context) => {
    if (body.originalName.trim().length === 0) {
      context.addIssue({ code: 'custom', path: ['originalName'], message: 'Имя файла не может быть пустым.' });
    }
    if (body.mimeType.trim() !== body.mimeType) {
      context.addIssue({ code: 'custom', path: ['mimeType'], message: 'MIME-тип не должен содержать пробелы.' });
    }
  })
  .transform((body) => ({ ...body, originalName: body.originalName.trim() }));

const errors: Record<FileOperationError, { statusCode: 400 | 403 | 404 | 409 | 413; error: ApiError }> = {
  checksum_mismatch: {
    statusCode: 409,
    error: { error: 'Conflict', code: 'checksum_mismatch', message: 'Контрольная сумма файла не совпадает.' },
  },
  file_too_large: {
    statusCode: 413,
    error: { error: 'Payload Too Large', code: 'file_too_large', message: 'Размер файла превышает допустимый.' },
  },
  forbidden: {
    statusCode: 403,
    error: { error: 'Forbidden', code: 'forbidden', message: 'Назначение файла недоступно для этой роли.' },
  },
  idempotency_conflict: {
    statusCode: 409,
    error: { error: 'Conflict', code: 'idempotency_conflict', message: 'Ключ идемпотентности уже использован.' },
  },
  invalid_state: {
    statusCode: 409,
    error: { error: 'Conflict', code: 'invalid_transition', message: 'Операция недоступна в текущем состоянии.' },
  },
  not_found: {
    statusCode: 404,
    error: { error: 'Not Found', code: 'not_found', message: 'Файл или связанный ресурс не найден.' },
  },
  photo_limit_exceeded: {
    statusCode: 409,
    error: { error: 'Conflict', code: 'photo_limit_exceeded', message: 'К пункту уже привязано двадцать фотографий.' },
  },
  project_archived: {
    statusCode: 409,
    error: { error: 'Conflict', code: 'project_archived', message: 'Архивный проект нельзя изменять.' },
  },
  unsupported_mime_type: {
    statusCode: 400,
    error: { error: 'Bad Request', code: 'unsupported_mime_type', message: 'MIME-тип файла не поддерживается.' },
  },
  upload_expired: {
    statusCode: 409,
    error: { error: 'Conflict', code: 'upload_expired', message: 'Срок upload-сессии истёк.' },
  },
  upload_incomplete: {
    statusCode: 409,
    error: { error: 'Conflict', code: 'upload_incomplete', message: 'Загрузка файла не завершена.' },
  },
};

function send<T>(reply: FastifyReply, result: FileOperationResult<T>, successStatus = 200) {
  if (result.status === 'ok') return reply.status(successStatus).send(result.value);
  const detail = errors[result.status];
  return reply.status(detail.statusCode).send(detail.error);
}

const errorResponses = {
  400: zApiError,
  401: zApiError,
  403: zApiError,
  404: zApiError,
  409: zApiError,
  413: zApiError,
};

export function registerFileRoutes(app: FastifyInstance, repository: FileRepository): void {
  app.post<{ Body: z.infer<typeof createUploadBodySchema> }>('/file-uploads', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: { body: createUploadBodySchema, response: { 201: zCreateFileUploadResponse, ...errorResponses } },
    handler: async (request, reply) =>
      send(reply, await repository.createUpload(request.body, request.auth!.user, requestAuditContext(request)), 201),
  });

  app.post<{
    Params: z.infer<typeof zCompleteFileUploadPath>;
    Body: z.infer<typeof zCompleteFileUploadBody>;
    Headers: { 'idempotency-key': string };
  }>('/file-uploads/:uploadId/completion', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: {
      params: completePathSchema,
      body: zCompleteFileUploadBody,
      headers: idempotencyHeadersSchema,
      response: { 200: zCompleteFileUploadResponse, ...errorResponses },
    },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.completeUpload(
          request.params.uploadId,
          request.body.checksumSha256,
          request.headers['idempotency-key'],
          request.auth!.user,
          requestAuditContext(request),
        ),
      ),
  });

  app.get<{ Params: z.infer<typeof zGetFileContentPath> }>('/files/:fileId/content', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: { params: filePathSchema, response: { 200: zGetFileContentResponse, ...errorResponses } },
    handler: async (request, reply) =>
      send(reply, await repository.getDownload(request.params.fileId, request.auth!.user)),
  });

  app.get<{ Params: z.infer<typeof zListChecklistItemPhotosPath> }>('/checklist/items/:itemId/photos', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: { params: listPhotosPathSchema, response: { 200: zListChecklistItemPhotosResponse, ...errorResponses } },
    handler: async (request, reply) =>
      send(reply, await repository.listPhotos(request.params.itemId, request.auth!.user)),
  });

  app.post<{
    Params: z.infer<typeof zCreateChecklistItemPhotoPath>;
    Body: z.infer<typeof zCreateChecklistItemPhotoBody>;
  }>('/checklist/items/:itemId/photos', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: {
      params: createPhotoPathSchema,
      body: zCreateChecklistItemPhotoBody,
      response: { 201: zCreateChecklistItemPhotoResponse, ...errorResponses },
    },
    handler: async (request, reply) =>
      send(
        reply,
        await repository.attachPhoto(
          request.params.itemId,
          request.body.fileId,
          request.auth!.user,
          requestAuditContext(request),
        ),
        201,
      ),
  });

  app.delete<{ Params: z.infer<typeof zDeleteChecklistItemPhotoPath> }>('/checklist/photos/:photoId', {
    preHandler: [app.authenticate, app.requireRoles('manager', 'foreman')],
    schema: { params: deletePhotoPathSchema, response: { 204: z.void(), ...errorResponses } },
    handler: async (request, reply) => {
      const result = await repository.deletePhoto(
        request.params.photoId,
        request.auth!.user,
        requestAuditContext(request),
      );
      if (result.status !== 'ok') return send(reply, result);
      return reply.status(204).send();
    },
  });
}
