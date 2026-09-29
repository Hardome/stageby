import type { FastifyPluginAsync } from 'fastify';

import { StageRepository } from '#app/modules/stages/repository';
import { registerStageRoutes } from '#app/modules/stages/routes';

export const stageModule: FastifyPluginAsync = async (app) => {
  registerStageRoutes(app, new StageRepository(app.db));
};
