import { cn } from 'cn';
import { ArrowUpRightIcon, PackageIcon, UserRoundIcon } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';

export function ProjectStageCardSkeleton() {
  return (
    <Card className="min-w-0 gap-4">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="size-10 shrink-0" />
            <CardTitle>
              <Skeleton className="h-6 w-32 max-w-full" />
            </CardTitle>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <ArrowUpRightIcon className="size-4 text-primary-text" aria-hidden="true" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <CardDescription>
          <Skeleton className="h-4 w-3/4" />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Готовность</span>
            <Skeleton className="h-5 w-10" />
          </div>
          <Skeleton className="h-1.5 w-full" />
        </div>
        <div className="flex items-center gap-3 border-t pt-4">
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full border',
              'bg-background text-muted-foreground',
            )}
          >
            <UserRoundIcon className="size-4" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-xs text-muted-foreground">Мастер</p>
            <Skeleton className="h-5 w-36" />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <PackageIcon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <Skeleton className="h-6 w-32" />
        </div>
      </CardContent>
      <CardFooter className="mt-auto bg-background text-foreground">
        <dl className="grid w-full grid-cols-2 gap-4">
          {['Работы', 'Материалы'].map((label) => (
            <div key={label} className="min-w-0">
              <dt className="mb-1 text-xs font-medium text-muted-foreground">{label}</dt>
              <dd className="flex items-center gap-2 text-sm">
                Факт: <Skeleton className="h-5 w-16" />
              </dd>
              <dd className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                План: <Skeleton className="h-4 w-16" />
              </dd>
            </div>
          ))}
        </dl>
      </CardFooter>
    </Card>
  );
}
