import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { NotFound } from '@shared/ui/not-found';
import { Skeleton } from '@shared/ui/skeleton';

import type { useGetProject } from '@api/queries/useGetProject';

interface ProjectUnavailableProperties {
  query: ReturnType<typeof useGetProject>;
}
export function ProjectUnavailable({ query }: ProjectUnavailableProperties) {
  if (query.isPending) return <Skeleton className="h-64" role="status" aria-label="Загрузка объекта" />;
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
