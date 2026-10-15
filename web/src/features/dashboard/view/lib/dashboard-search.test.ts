import { addCalendarDays, dashboardSearchSchema, isCalculationAvailable } from './dashboard-search';

describe('dashboard dates and pagination', () => {
  it('includes today and day 30 across a month boundary', () => {
    expect(addCalendarDays('2026-10-04', 30)).toBe('2026-11-03');
    expect(isCalculationAvailable('2026-10-04', '2026-10-04')).toBe(true);
    expect(isCalculationAvailable('2026-11-03', '2026-10-04')).toBe(true);
  });

  it.each(['2026-10-03', '2026-11-04', '2026-02-30', '04.10.2026', '', 'invalid'])(
    'rejects unavailable date %s',
    (through) => {
      expect(isCalculationAvailable(through, '2026-10-04')).toBe(false);
    },
  );

  it('preserves an invalid date for feedback and validates the offset', () => {
    expect(dashboardSearchSchema.parse({ through: 'invalid', offset: -1 })).toEqual({ through: 'invalid', offset: 0 });
    expect(dashboardSearchSchema.parse({ through: '2026-10-04', offset: 20 })).toEqual({
      through: '2026-10-04',
      offset: 20,
    });
  });
});
