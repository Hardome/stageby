import type { FastifyPluginAsync } from 'fastify';

import { WorkPlanRowRepository } from '#app/modules/work-plan-rows/repository';
import { registerWorkPlanRowRoutes } from '#app/modules/work-plan-rows/routes';

export const workPlanRowModule: FastifyPluginAsync = async (app) => {
  registerWorkPlanRowRoutes(app, new WorkPlanRowRepository(app.db));
};
