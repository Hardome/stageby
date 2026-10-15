import { ClipboardCheckIcon } from 'lucide-react';

import { StageChecklistSkeleton } from '@entities/stage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';

import { StageFinancesSkeleton } from './stage-finances-skeleton';
import { StageProjectSkeleton } from './stage-project-skeleton';
import { StageSummarySkeleton } from './stage-summary-skeleton';

export function StageOverviewSkeleton({ withWorkSummary = true }: { withWorkSummary?: boolean }) {
  return (
    <div aria-hidden="true" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>
      <StageSummarySkeleton />
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
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
        <div className="flex min-w-0 flex-col gap-4">
          <StageProjectSkeleton />
          <StageFinancesSkeleton category="materials" />
          {withWorkSummary && <StageFinancesSkeleton category="work" />}
        </div>
      </div>
    </div>
  );
}
