import type { FastifyInstance } from 'fastify';

import type { RouteHandlers } from '../generated/fastify.gen.js';
import {
  zCreateTodoBody,
  zCreateTodoResponse,
  zDeleteTodoPath,
  zError,
  zGetTodoPath,
  zGetTodoResponse,
  zListTodosResponse,
  zUpdateTodoBody,
  zUpdateTodoPath,
  zUpdateTodoResponse,
} from '../generated/zod.gen.js';
import type { TodoRepository } from './todo-repository.js';

const updateTodoBodySchema = zUpdateTodoBody.refine((body) => Object.keys(body).length > 0, {
  message: 'At least one field is required',
});

const notFoundResponse = {
  error: 'Not Found',
  message: 'Todo not found',
};

export function registerTodoRoutes(app: FastifyInstance, repository: TodoRepository): void {
  const listTodos: RouteHandlers['listTodos'] = async (_request, reply) => {
    return reply.status(200).send(await repository.findAll());
  };

  const createTodo: RouteHandlers['createTodo'] = async (request, reply) => {
    const todo = await repository.create(request.body);
    return reply.status(201).send(todo);
  };

  const getTodo: RouteHandlers['getTodo'] = async (request, reply) => {
    const todo = await repository.findById(request.params.id);

    if (!todo) {
      return reply.status(404).send(notFoundResponse);
    }

    return reply.status(200).send(todo);
  };

  const updateTodo: RouteHandlers['updateTodo'] = async (request, reply) => {
    const todo = await repository.update(request.params.id, request.body);

    if (!todo) {
      return reply.status(404).send(notFoundResponse);
    }

    return reply.status(200).send(todo);
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
        400: zError,
      },
    },
    handler: createTodo,
  });

  app.get('/todos/:id', {
    schema: {
      params: zGetTodoPath,
      response: {
        200: zGetTodoResponse,
        404: zError,
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
        400: zError,
        404: zError,
      },
    },
    handler: updateTodo,
  });

  app.delete('/todos/:id', {
    schema: {
      params: zDeleteTodoPath,
      response: {
        404: zError,
      },
    },
    handler: deleteTodo,
  });
}
