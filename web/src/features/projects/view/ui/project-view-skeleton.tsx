import { ProjectDocumentsCardSkeleton } from '@entities/project';

import { ProjectFinancesSkeleton } from './project-finances-skeleton';
import { ProjectHeaderSkeleton } from './project-header-skeleton';
import { ProjectStagesSkeleton } from './project-stages-skeleton';

export function ProjectViewSkeleton() {
  return (
    <div aria-hidden="true" className="flex min-w-0 flex-col gap-5">
      <ProjectHeaderSkeleton />
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ProjectFinancesSkeleton />
        <ProjectDocumentsCardSkeleton />
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
