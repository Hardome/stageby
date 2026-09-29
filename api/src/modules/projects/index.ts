import type { FastifyPluginAsync } from 'fastify';

import { ProjectRepository } from '#app/modules/projects/repository';
import { registerProjectRoutes } from '#app/modules/projects/routes';
import { ProjectService } from '#app/modules/projects/service';

export const projectModule: FastifyPluginAsync = async (app) => {
  registerProjectRoutes(app, new ProjectService(new ProjectRepository(app.db)));
};
