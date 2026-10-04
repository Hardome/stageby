import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import {
  zApiError,
  zDashboardMoneyMetric,
  zDashboardProjectPage,
  zDashboardProjectRow,
  zDashboardSelectedStage,
  zDashboardSummary,
  zGetDashboardSummaryQuery,
  zListDashboardProjectsQuery,
  zProjectFinancialSummary,
  zStageFinancialSummary,
} from '#app/generated/zod.gen';
import { calendarDate, validThrough } from '#app/modules/dashboard/calendar';
import type { DashboardRepository } from '#app/modules/dashboard/repository';
import { coerceRequestValues } from '#app/plugins/request-values';

const money = z.number().int().nonnegative().safe();
const metric = zDashboardMoneyMetric.extend({
  plannedAmountMinor: money.nullable(),
  actualAmountMinor: money,
  balanceAmountMinor: z.number().int().safe().nullable(),
});
const finances = zStageFinancialSummary.extend({
  plannedWorkAmountMinor: money.nullable(),
  actualWorkAmountMinor: money,
  workBalanceAmountMinor: z.number().int().safe().nullable(),
  plannedMaterialAmountMinor: money.nullable(),
  actualMaterialAmountMinor: money,
  totalPlannedAmountMinor: money.nullable(),
  totalActualAmountMinor: money,
});
const projectFinances = zProjectFinancialSummary.extend({
  plannedWorkAmountMinor: money.nullable(),
  actualWorkAmountMinor: money,
  plannedMaterialAmountMinor: money.nullable(),
  actualMaterialAmountMinor: money,
  totalPlannedAmountMinor: money.nullable(),
  totalActualAmountMinor: money,
});
const errors = { 400: zApiError, 401: zApiError, 403: zApiError };

export function registerDashboardRoutes(app: FastifyInstance, repository: DashboardRepository): void {
  const managerOnly = [app.authenticate, app.requireRoles('manager')];
  app.get<{ Querystring: { through?: string } }>('/dashboard/summary', {
    preHandler: managerOnly,
    schema: {
      querystring: zGetDashboardSummaryQuery
        .strict()
        .transform((query) => ({ through: query.through ?? calendarDate() }))
        .refine((query) => validThrough(query.through), {
          message: 'Дата должна быть в диапазоне сегодня…сегодня + 30 дней в Екатеринбурге.',
        }),
      response: { 200: zDashboardSummary.extend({ works: metric, materials: metric, total: metric }), ...errors },
    },
    handler: (request) => repository.summary(request.query.through!),
  });
  app.get<{ Querystring: { limit?: number; offset?: number } }>('/dashboard/projects', {
    preHandler: managerOnly,
    schema: {
      querystring: z.preprocess(coerceRequestValues, zListDashboardProjectsQuery.strict()),
      response: {
        200: zDashboardProjectPage.extend({
          items: z.array(
            zDashboardProjectRow.extend({
              finances: projectFinances,
              selectedStage: zDashboardSelectedStage.extend({ finances }).nullable(),
            }),
          ),
        }),
        ...errors,
      },
    },
    handler: (request) => repository.list(request.query.limit ?? 20, request.query.offset ?? 0),
  });
}
