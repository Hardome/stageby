import type { FastifyPluginAsync } from 'fastify';

import { WorkPaymentRepository } from '#app/modules/work-payments/repository';
import { registerWorkPaymentRoutes } from '#app/modules/work-payments/routes';
import { workPlanRowModule } from '#app/modules/work-plan-rows/index';

export const workPaymentModule: FastifyPluginAsync = async (app) => {
  await app.register(workPlanRowModule);
  registerWorkPaymentRoutes(app, new WorkPaymentRepository(app.db));
};
