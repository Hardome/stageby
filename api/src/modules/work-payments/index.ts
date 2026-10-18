import type { FastifyPluginAsync } from 'fastify';

import { WorkPaymentRepository } from '#app/modules/work-payments/repository';
import { registerWorkPaymentRoutes } from '#app/modules/work-payments/routes';

export const workPaymentModule: FastifyPluginAsync = async (app) => {
  registerWorkPaymentRoutes(app, new WorkPaymentRepository(app.db));
};
