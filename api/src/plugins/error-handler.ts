import type { FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from 'fastify-type-provider-zod';

import type { Environment } from '#app/config/env';

const errorTitles: Record<number, string> = {
  400: 'Некорректный запрос',
  401: 'Требуется авторизация',
  403: 'Доступ запрещён',
  404: 'Не найдено',
  409: 'Конфликт',
  429: 'Слишком много запросов',
  500: 'Внутренняя ошибка сервера',
  503: 'Сервис недоступен',
};

const errorCodes: Record<number, string> = {
  400: 'invalid_request',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  429: 'rate_limited',
  500: 'internal_error',
  503: 'service_unavailable',
};

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
  app.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({
      error: errorTitles[404],
      code: errorCodes[404],
      message: 'Маршрут не найден',
    });
  });

  app.setErrorHandler((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        error: errorTitles[400],
        code: errorCodes[400],
        message: 'Ошибка проверки данных запроса',
        details: error.validation.map((issue) => ({
          path: `${error.validationContext ?? 'request'}${issue.instancePath.replaceAll('/', '.')}`,
          message: issue.message ?? 'Некорректное значение',
        })),
      });
    }

    if (isResponseSerializationError(error)) {
      request.log.error({ error }, 'Ошибка формирования ответа');
      return reply.status(500).send({
        error: errorTitles[500],
        code: errorCodes[500],
        message: 'Ошибка формирования ответа',
      });
    }

    const statusCode = getStatusCode(error);
    let message = error instanceof Error ? error.message : 'Неизвестная ошибка';

    if (statusCode === 429) {
      message = 'Превышен лимит запросов';
    } else if (statusCode >= 500 && environment.NODE_ENV === 'production') {
      message = 'Внутренняя ошибка сервера';
    }

    request.log.error({ error, statusCode }, 'Ошибка при обработке запроса');

    return reply.status(statusCode).send({
      error: errorTitles[statusCode] ?? 'Ошибка',
      code: errorCodes[statusCode] ?? 'unknown_error',
      message,
    });
  });
}
