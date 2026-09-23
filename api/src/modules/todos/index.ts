import type { FastifyPluginAsync } from 'fastify';

import { TodoRepository } from '#app/modules/todos/repository';
import { registerTodoRoutes } from '#app/modules/todos/routes';

export const todoModule: FastifyPluginAsync = async (app) => {
  registerTodoRoutes(app, new TodoRepository(app.db));
};
