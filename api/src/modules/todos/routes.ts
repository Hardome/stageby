import type { FastifyInstance } from 'fastify';

import {
  zApiError,
  zCreateTodoBody,
  zCreateTodoResponse,
  zDeleteTodoPath,
  zGetTodoPath,
  zGetTodoResponse,
  zListTodosResponse,
  zUpdateTodoBody,
  zUpdateTodoPath,
  zUpdateTodoResponse,
} from '#app/generated/zod.gen';
import { toTodo } from '#app/modules/todos/mapper';
import type { TodoRepository } from '#app/modules/todos/repository';
import type { RouteHandlers } from '#app/modules/todos/types';

const updateTodoBodySchema = zUpdateTodoBody.refine((body) => Object.keys(body).length > 0, {
  message: 'Укажите хотя бы одно поле',
});

const notFoundResponse = {
  error: 'Not Found',
  code: 'not_found' as const,
  message: 'Задача не найдена',
};

export function registerTodoRoutes(app: FastifyInstance, repository: TodoRepository): void {
  const listTodos: RouteHandlers['listTodos'] = async (_request, reply) => {
    const todos = await repository.findAll();
    return reply.status(200).send(todos.map(toTodo));
  };

  const createTodo: RouteHandlers['createTodo'] = async (request, reply) => {
    const todo = await repository.create(request.body);
    return reply.status(201).send(toTodo(todo));
  };

  const getTodo: RouteHandlers['getTodo'] = async (request, reply) => {
    const todo = await repository.findById(request.params.id);

    if (!todo) {
      return reply.status(404).send(notFoundResponse);
    }

    return reply.status(200).send(toTodo(todo));
  };

  const updateTodo: RouteHandlers['updateTodo'] = async (request, reply) => {
    const todo = await repository.update(request.params.id, request.body);

    if (!todo) {
      return reply.status(404).send(notFoundResponse);
    }

    return reply.status(200).send(toTodo(todo));
  };

  const deleteTodo: RouteHandlers['deleteTodo'] = async (request, reply) => {
    const deleted = await repository.delete(request.params.id);

    if (!deleted) {
      return reply.status(404).send(notFoundResponse);
    }

    return reply.status(204).send();
  };

  app.get('/todos', {
    schema: {
      response: {
        200: zListTodosResponse,
      },
    },
    handler: listTodos,
  });

  app.post('/todos', {
    schema: {
      body: zCreateTodoBody,
      response: {
        201: zCreateTodoResponse,
        400: zApiError,
      },
    },
    handler: createTodo,
  });

  app.get('/todos/:id', {
    schema: {
      params: zGetTodoPath,
      response: {
        200: zGetTodoResponse,
        404: zApiError,
      },
    },
    handler: getTodo,
  });

  app.patch('/todos/:id', {
    schema: {
      body: updateTodoBodySchema,
      params: zUpdateTodoPath,
      response: {
        200: zUpdateTodoResponse,
        400: zApiError,
        404: zApiError,
      },
    },
    handler: updateTodo,
  });

  app.delete('/todos/:id', {
    schema: {
      params: zDeleteTodoPath,
      response: {
        404: zApiError,
      },
    },
    handler: deleteTodo,
  });
}
