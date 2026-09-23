import { STATUS_CODES } from 'node:http';

import type { FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from 'fastify-type-provider-zod';

import type { Environment } from './config/env.js';

function getStatusCode(error: unknown): number {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    error.statusCode >= 400
  ) {
    return error.statusCode;
  }

  return 500;
}

export function registerErrorHandler(app: FastifyInstance, environment: Environment): void {
  app.setErrorHandler((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Request validation failed',
        details: error.validation,
      });
    }

    if (isResponseSerializationError(error)) {
      request.log.error({ error }, 'Response serialization failed');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Response serialization failed',
      });
    }

    const statusCode = getStatusCode(error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const message = statusCode >= 500 && environment.NODE_ENV === 'production' ? 'Internal Server Error' : errorMessage;

    request.log.error({ error, statusCode }, 'Request failed');

    return reply.status(statusCode).send({
      error: STATUS_CODES[statusCode] ?? 'Error',
      message,
    });
  });
}
