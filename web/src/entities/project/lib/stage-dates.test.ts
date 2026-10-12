import { formatStageDates, isStageOverdue, todayInYekaterinburg } from './stage-dates';

describe('stage dates', () => {
  it('keeps each independently missing date visible', () => {
    expect(formatStageDates(null, null)).toBe('Даты не заданы');
    expect(formatStageDates('2026-10-12', null)).toBe('12.10.2026 — Дата окончания не задана');
    expect(formatStageDates(null, '2026-10-12')).toBe('Дата начала не задана — 12.10.2026');
  });
  it('uses the calendar day in Yekaterinburg at the UTC boundary', () => {
    expect(todayInYekaterinburg(new Date('2026-10-11T18:59:59Z'))).toBe('2026-10-11');
    expect(todayInYekaterinburg(new Date('2026-10-11T19:00:00Z'))).toBe('2026-10-12');
  });
  it('requires an elapsed end date and unfinished work for overdue status', () => {
    expect(isStageOverdue({ plannedEndDate: null, status: 'assigned' }, '2026-10-12')).toBe(false);
    expect(isStageOverdue({ plannedEndDate: '2026-10-12', status: 'assigned' }, '2026-10-12')).toBe(false);
    expect(isStageOverdue({ plannedEndDate: '2026-10-11', status: 'assigned' }, '2026-10-12')).toBe(true);
    expect(isStageOverdue({ plannedEndDate: '2026-10-11', status: 'paid' }, '2026-10-12')).toBe(false);
  });
});
