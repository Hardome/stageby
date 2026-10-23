import { z } from 'zod';

export const dashboardPageSize = 20;

export const dashboardSearchSchema = z.object({
  through: z.string().catch('').optional(),
  offset: z.number().int().min(0).max(2147483647).catch(0).optional(),
});

export function addCalendarDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

export function isCalculationAvailable(through: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(through)) return false;

  const date = new Date(`${through}T00:00:00Z`);

  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().startsWith(through) &&
    through >= today &&
    through <= addCalendarDays(today, 30)
  );
}
