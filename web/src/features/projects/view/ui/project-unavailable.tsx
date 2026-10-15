import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { NotFound } from '@shared/ui/not-found';

import type { useGetProject } from '@api/queries/useGetProject';

import { ProjectViewSkeleton } from './project-view-skeleton';

interface ProjectUnavailableProperties {
  query: ReturnType<typeof useGetProject>;
}
export function ProjectUnavailable({ query }: ProjectUnavailableProperties) {
  if (query.isPending)
    return <DataRegion initialLabel="Загрузка объекта" isLoading skeleton={<ProjectViewSkeleton />} />;
  const status = query.error?.status;
  if (status === 403 || status === 404) return <NotFound />;

  return (
    <Alert variant="destructive">
      <AlertDescription>
        Не удалось загрузить объект.
        <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
          Повторить
        </Button>
      </AlertDescription>
    </Alert>
  );
}
