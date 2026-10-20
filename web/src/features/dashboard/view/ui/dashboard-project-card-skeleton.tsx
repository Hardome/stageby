import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';

export function DashboardProjectCardSkeleton() {
  return (
    <Card className="min-w-0 gap-4">
      <CardHeader className="gap-2">
        <CardTitle>
          <Skeleton className="h-6 w-3/5" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-5 w-4/5" />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-xl border bg-background p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            Текущий этап · <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <div className="flex min-h-10 items-center">
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <dl className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-xs">Материалы</dt>
            <dd className="flex min-h-10 items-center">
              <Skeleton className="h-6 w-36" />
            </dd>
          </div>
          <div className="flex flex-col gap-2 border-t pt-4">
            <dt className="text-muted-foreground text-xs">Мастер</dt>
            <dd>
              <Skeleton className="h-5 w-40" />
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
