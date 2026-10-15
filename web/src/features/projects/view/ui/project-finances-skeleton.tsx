import { WalletIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';

export function ProjectFinancesSkeleton() {
  return (
    <Card className="min-w-0">
      <CardHeader className="gap-3">
        <CardTitle>
          <h2 className="flex items-center gap-2">
            <WalletIcon className="size-5 text-primary-text" aria-hidden="true" />
            Финансы объекта
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <div className="min-w-0">
            <p className="mb-2 text-muted-foreground text-xs">Фактические затраты · итого</p>
            <Skeleton className="h-9 w-3/4 sm:h-10" />
          </div>
          <div className="min-w-0 rounded-xl border bg-background p-4 text-foreground">
            <p className="mb-1 text-muted-foreground text-xs">Общий план</p>
            <Skeleton className="h-7 w-3/4" />
          </div>
        </div>
        <dl className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
          {['Работы', 'Материалы'].map((label) => (
            <div key={label} className="min-w-0">
              <dt className="mb-2 font-medium text-muted-foreground text-sm">{label}</dt>
              <dd className="flex items-center gap-2 font-semibold text-lg">
                Факт: <Skeleton className="h-7 w-24" />
              </dd>
              <dd className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
                План: <Skeleton className="h-5 w-24" />
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
