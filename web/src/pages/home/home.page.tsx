import { useCallback, useEffect } from 'react';

import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { CalendarDaysIcon, PlusIcon } from 'lucide-react';

import { addCalendarDays, DashboardProjects, DashboardSummary } from '@features/dashboard/view';
import { formatDate, todayInYekaterinburg } from '@entities/project';
import { Button } from '@shared/ui/button';
import { DatePicker } from '@shared/ui/date-picker';
import { Field, FieldLabel } from '@shared/ui/field';

export function HomePage() {
  const search = useSearch({ from: '/_auth/' });
  const navigate = useNavigate();
  const today = todayInYekaterinburg();
  const through = search.through ?? today;

  useEffect(() => {
    if (search.through === undefined) {
      void navigate({ to: '/', search: (previous) => ({ ...previous, through: today }), replace: true });
    }
  }, [search.through, today, navigate]);

  const changePage = useCallback(
    (offset: number, shouldReplace = false) => {
      void navigate({ to: '/', search: (previous) => ({ ...previous, offset }), replace: shouldReplace });
    },
    [navigate],
  );

  return (
    <main className="min-w-0 flex-1 bg-background px-4 py-4 sm:px-5 sm:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <p className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">Обзор строительства</p>
            <h1 className="font-bold text-2xl tracking-tight sm:text-3xl">Дашборд руководителя</h1>
          </div>
          <Button render={<Link to="/projects/new" />} nativeButton={false}>
            <PlusIcon data-icon="inline-start" />
            Создать объект
          </Button>
        </header>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3 pb-1 text-sm">
            <CalendarDaysIcon className="size-5 text-muted-foreground" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs">Сегодня</span>
              <time dateTime={today} className="font-semibold">
                {formatDate(today)}
              </time>
            </div>
          </div>
          <Field className="w-full sm:w-64">
            <FieldLabel htmlFor="dashboard-through">План по деньгам к дате</FieldLabel>
            <DatePicker
              id="dashboard-through"
              showClearButton={false}
              value={through}
              min={today}
              max={addCalendarDays(today, 30)}
              onChange={(value) => {
                void navigate({ to: '/', search: { through: value, offset: 0 } });
              }}
            />
          </Field>
        </div>
        <DashboardSummary through={through} today={today} />
        <DashboardProjects offset={search.offset ?? 0} today={today} onPageChange={changePage} />
      </div>
    </main>
  );
}
