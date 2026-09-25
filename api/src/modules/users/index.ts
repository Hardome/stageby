import type { FastifyPluginAsync } from 'fastify';

import { UserRepository } from '#app/modules/users/repository';
import { registerUserRoutes } from '#app/modules/users/routes';
import { UserService } from '#app/modules/users/service';

export const userModule: FastifyPluginAsync = async (app) => {
  registerUserRoutes(app, new UserService(new UserRepository(app.db)));
};
