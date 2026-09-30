import type { FastifyPluginAsync } from 'fastify';

import { MaterialRepository } from '#app/modules/materials/repository';
import { registerMaterialRoutes } from '#app/modules/materials/routes';

export const materialModule: FastifyPluginAsync = async (app) => {
  registerMaterialRoutes(app, new MaterialRepository(app.db));
};
