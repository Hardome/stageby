import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { RouteHandlers } from '#app/generated/fastify.gen';
import type { ApiError } from '#app/generated/types.gen';
import {
  zApiError,
  zCreateUserBody,
  zCreateUserResponse,
  zGetUserPath,
  zGetUserResponse,
  zListUsersQuery,
  zListUsersResponse,
  zSetUserPasswordBody,
  zSetUserPasswordPath,
  zUpdateUserBody,
  zUpdateUserPath,
  zUpdateUserResponse,
} from '#app/generated/zod.gen';
import { toUser } from '#app/modules/users/mapper';
import type { UserService } from '#app/modules/users/service';

const updateUserBodySchema = zUpdateUserBody.refine((body) => Object.keys(body).length > 0, {
  message: 'Укажите хотя бы одно поле',
});

const listUsersQuerySchema = z.preprocess((value) => {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const query = value as Record<string, unknown>;
  return {
    ...query,
    ...(typeof query.limit === 'string' ? { limit: Number(query.limit) } : {}),
    ...(typeof query.offset === 'string' ? { offset: Number(query.offset) } : {}),
    ...(query.isActive === 'true' ? { isActive: true } : {}),
    ...(query.isActive === 'false' ? { isActive: false } : {}),
  };
}, zListUsersQuery);

function coerceUserId(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const path = value as Record<string, unknown>;
  return { ...path, ...(typeof path.userId === 'string' ? { userId: Number(path.userId) } : {}) };
}

const getUserPathSchema = z.preprocess(coerceUserId, zGetUserPath);
const updateUserPathSchema = z.preprocess(coerceUserId, zUpdateUserPath);
const setUserPasswordPathSchema = z.preprocess(coerceUserId, zSetUserPasswordPath);

const errors = {
  notFound: { error: 'Not Found', code: 'not_found', message: 'Пользователь не найден.' },
  loginTaken: { error: 'Conflict', code: 'login_taken', message: 'Этот логин уже занят.' },
  lastManager: {
    error: 'Conflict',
    code: 'last_manager',
    message: 'Нельзя деактивировать или изменить роль последнего активного руководителя.',
  },
  userInUse: {
    error: 'Conflict',
    code: 'user_in_use',
    message: 'Пользователь назначен на незавершённый этап.',
  },
} satisfies Record<string, ApiError>;

export function registerUserRoutes(app: FastifyInstance, service: UserService): void {
  const managerOnly = [app.authenticate, app.requireRoles('manager')];

  const listUsers: RouteHandlers['listUsers'] = async (request, reply) => {
    const query = request.query ?? {};
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const result = await service.list({
      limit,
      offset,
      ...(query.role !== undefined ? { role: query.role } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search !== undefined ? { search: query.search } : {}),
    });

    return reply.status(200).send({
      items: result.items.map(toUser),
      total: result.total,
      limit,
      offset,
    });
  };

  const createUser: RouteHandlers['createUser'] = async (request, reply) => {
    const result = await service.create(request.body);

    if (result.status === 'login_taken') {
      return reply.status(409).send(errors.loginTaken);
    }

    return reply.status(201).send(toUser(result.user));
  };

  const getUser: RouteHandlers['getUser'] = async (request, reply) => {
    const user = await service.findById(request.params.userId);
    return user ? reply.status(200).send(toUser(user)) : reply.status(404).send(errors.notFound);
  };

  const updateUser: RouteHandlers['updateUser'] = async (request, reply) => {
    const result = await service.update(request.params.userId, request.body);

    if (result.status === 'not_found') {
      return reply.status(404).send(errors.notFound);
    }

    if (result.status === 'last_manager') {
      return reply.status(409).send(errors.lastManager);
    }

    if (result.status === 'user_in_use') {
      return reply.status(409).send(errors.userInUse);
    }

    return reply.status(200).send(toUser(result.user));
  };

  const setUserPassword: RouteHandlers['setUserPassword'] = async (request, reply) => {
    const updated = await service.setPassword(request.params.userId, request.body.password);
    return updated ? reply.status(204).send() : reply.status(404).send(errors.notFound);
  };

  app.get('/users', {
    preHandler: managerOnly,
    schema: {
      querystring: listUsersQuerySchema,
      response: { 200: zListUsersResponse, 400: zApiError, 401: zApiError, 403: zApiError },
    },
    handler: listUsers,
  });

  app.post('/users', {
    preHandler: managerOnly,
    schema: {
      body: zCreateUserBody,
      response: { 201: zCreateUserResponse, 400: zApiError, 401: zApiError, 403: zApiError, 409: zApiError },
    },
    handler: createUser,
  });

  app.get('/users/:userId', {
    preHandler: managerOnly,
    schema: {
      params: getUserPathSchema,
      response: { 200: zGetUserResponse, 400: zApiError, 401: zApiError, 403: zApiError, 404: zApiError },
    },
    handler: getUser,
  });

  app.patch('/users/:userId', {
    preHandler: managerOnly,
    schema: {
      body: updateUserBodySchema,
      params: updateUserPathSchema,
      response: {
        200: zUpdateUserResponse,
        400: zApiError,
        401: zApiError,
        403: zApiError,
        404: zApiError,
        409: zApiError,
      },
    },
    handler: updateUser,
  });

  app.put('/users/:userId/password', {
    preHandler: managerOnly,
    schema: {
      body: zSetUserPasswordBody,
      params: setUserPasswordPathSchema,
      response: { 400: zApiError, 401: zApiError, 403: zApiError, 404: zApiError },
    },
    handler: setUserPassword,
  });
}
