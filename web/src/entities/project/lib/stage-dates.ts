import type { Stage } from '@api/types';

export function formatDate(value: string): string {
  const [year, month, day] = value.split('-', 3);
  return `${day}.${month}.${year}`;
}

export function formatStageDates(start: string | null, end: string | null): string {
  if (!start && !end) return 'Даты не заданы';
  const from = start ? formatDate(start) : 'Дата начала не задана';
  const through = end ? formatDate(end) : 'Дата окончания не задана';
  return `${from} — ${through}`;
}

export function todayInYekaterinburg(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Yekaterinburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function isStageOverdue(stage: Pick<Stage, 'plannedEndDate' | 'status'>, today: string): boolean {
  return Boolean(
    stage.plannedEndDate && stage.plannedEndDate < today && stage.status !== 'completed' && stage.status !== 'paid',
  );
}
