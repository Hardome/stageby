import { FileTextIcon } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';

import { ProjectFinancesSkeleton } from './project-finances-skeleton';
import { ProjectHeaderSkeleton } from './project-header-skeleton';
import { ProjectStagesSkeleton } from './project-stages-skeleton';

export function ProjectViewSkeleton() {
  return (
    <div aria-hidden="true" className="flex min-w-0 flex-col gap-8">
      <ProjectHeaderSkeleton />
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ProjectFinancesSkeleton />
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>
              <h2 className="flex items-center gap-2">
                <FileTextIcon className="size-5 text-primary-text" aria-hidden="true" />
                Проект (PDF)
              </h2>
            </CardTitle>
            <CardDescription>Документация объекта</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-bold text-2xl tracking-tight">Этапы строительства</h2>
          <p className="text-muted-foreground text-sm">Последовательность и состояние работ</p>
        </div>
        <ProjectStagesSkeleton />
      </section>
    </div>
  );
}
