import { ProjectStageCardSkeleton } from './project-stage-card-skeleton';

export function ProjectStagesSkeleton() {
  return (
    <div aria-hidden="true" className="grid min-w-0 gap-4 lg:grid-cols-2">
      <ProjectStageCardSkeleton />
      <ProjectStageCardSkeleton />
    </div>
  );
}
