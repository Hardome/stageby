import { ClipboardCheckIcon } from 'lucide-react';

import { ProjectDocumentsCardSkeleton } from '@entities/project';
import { StageChecklistSkeleton } from '@entities/stage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';

import { StageSummarySkeleton } from './stage-summary-skeleton';

export function StageOverviewSkeleton() {
  return (
    <div aria-hidden="true" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>
      <StageSummarySkeleton />
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
          <Skeleton className="h-12 w-full" />
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>
                <h2 className="flex items-center gap-2">
                  <ClipboardCheckIcon className="size-5 text-primary-text" aria-hidden="true" />
                  Чек-лист
                </h2>
              </CardTitle>
              <CardDescription>Контрольные точки и готовность работ</CardDescription>
            </CardHeader>
            <CardContent>
              <StageChecklistSkeleton />
            </CardContent>
          </Card>
        </div>
        <div className="order-1 flex min-w-0 flex-col gap-4 lg:order-2">
          <Skeleton className="h-16 w-full lg:hidden" />
          <div className="hidden lg:block">
            <ProjectDocumentsCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
