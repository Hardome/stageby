import type { FastifyPluginAsync } from 'fastify';

import { DashboardRepository } from '#app/modules/dashboard/repository';
import { registerDashboardRoutes } from '#app/modules/dashboard/routes';

export const dashboardModule: FastifyPluginAsync = async (app) => {
  registerDashboardRoutes(app, new DashboardRepository(app.db));
};
