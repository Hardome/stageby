import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Skeleton } from '@shared/ui/skeleton';

import type { useGetProject } from '@api/queries/useGetProject';

interface ProjectUnavailableProperties {
  query: ReturnType<typeof useGetProject>;
}
export function ProjectUnavailable({ query }: ProjectUnavailableProperties) {
  if (query.isPending) return <Skeleton className="h-64" role="status" aria-label="Загрузка объекта" />;
  const status = query.error?.status;
  const messages: Record<number, string> = { 404: 'Объект не найден.', 403: 'Нет доступа к этому объекту.' };

  return (
    <Alert variant="destructive">
      <AlertDescription>
        {messages[status ?? 0] ?? 'Не удалось загрузить объект.'}
        {status !== 404 && status !== 403 && (
          <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
            Повторить
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
