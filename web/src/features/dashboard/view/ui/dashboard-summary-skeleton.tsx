import { Skeleton } from '@shared/ui/skeleton';

import { DashboardActivity } from './dashboard-activity';

export function DashboardSummarySkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
      <DashboardActivity count={0} isLoading />
      <div className="overflow-hidden rounded-2xl border bg-card text-card-foreground">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-5 sm:pt-4">
          <h3 className="font-semibold">Общий итог</h3>
          <Skeleton className="h-4 w-24" />
        </div>
        <dl className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-[1.4fr_1fr_1fr] sm:p-4">
          {['Остаток к оплате', 'План к дате', 'Факт'].map((label, index) => (
            <div key={label} className={index === 0 ? 'col-span-2 sm:col-span-1' : undefined}>
              <dt className="mb-2 text-muted-foreground text-xs">{label}</dt>
              <dd>
                <Skeleton className={index === 0 ? 'h-10 w-3/4' : 'h-7 w-3/4'} />
              </dd>
            </div>
          ))}
        </dl>
        <div className="grid border-t sm:grid-cols-2">
          {['Работы', 'Материалы'].map((label) => (
            <div
              key={label}
              className="flex flex-col gap-4 p-4 last:border-t sm:p-4 sm:last:border-t-0 sm:last:border-l"
            >
              <h4 className="font-semibold text-sm">{label}</h4>
              <dl className="grid grid-cols-3 gap-3 text-sm">
                {['План', 'Факт', 'Остаток'].map((metric) => (
                  <div key={metric} className="min-w-0">
                    <dt className="mb-1.5 text-muted-foreground text-xs">{metric}</dt>
                    <dd>
                      <Skeleton className="h-5 w-3/4" />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
