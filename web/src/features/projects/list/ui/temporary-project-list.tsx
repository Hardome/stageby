import { useEffect } from 'react';

import { Link } from '@tanstack/react-router';
import { cn } from 'cn';

import { formatDate, projectStatuses } from '@entities/project';
import { useAccessError } from '@shared/lib/hooks';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@shared/ui/empty';
import { NotFound } from '@shared/ui/not-found';
import { Skeleton } from '@shared/ui/skeleton';

import { useListProjects } from '@api/queries/useListProjects';

import { getProjectsQuery } from '../lib/project-search';
import { projectPageSize } from '../model/data';
import type { ProjectsSearch } from '../model/types';

interface TemporaryProjectListProperties {
  search: ProjectsSearch;
  onPageChange: (offset: number, shouldReplace?: boolean) => void;
}

// Temporary: remove this feature and its HomePage connection when the manager dashboard is ready.
export function TemporaryProjectList({ search, onPageChange }: TemporaryProjectListProperties) {
  const query = useListProjects({ query: getProjectsQuery(search) }, { query: { retry: false } });
  const accessError = useAccessError();
  const offset = search.offset ?? 0;
  useEffect(() => {
    if (query.error) accessError(query.error);
  }, [query.error, accessError]);
  useEffect(() => {
    if (query.data && offset > 0 && offset >= query.data.total) {
      onPageChange(Math.max(0, Math.ceil(query.data.total / projectPageSize) - 1) * projectPageSize, true);
    }
  }, [query.data, offset, onPageChange]);

  if (query.error?.status === 403 || query.error?.status === 404) return <NotFound />;

  return (
    <section aria-label="Объекты" aria-busy={query.isFetching} className="flex min-w-0 flex-col gap-4">
      <h2 className="font-semibold text-xl">Объекты</h2>
      {query.isPending && <Skeleton className="h-40" role="status" aria-label="Загрузка объектов" />}
      {query.isFetching && !query.isPending && <p role="status">Обновляем список…</p>}
      {query.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            Не удалось загрузить объекты.
            <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {query.data && (
        <>
          {query.data.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Объектов пока нет</EmptyTitle>
                <EmptyDescription>Создайте первый объект, чтобы начать работу.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {query.data.items.map((project) => (
                <li key={project.id}>
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: String(project.id) }}
                    className={cn([
                      'flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-5',
                      'text-card-foreground hover:bg-muted focus-visible:outline-ring',
                    ])}
                  >
                    <span className="break-words font-semibold">
                      {project.ownerName} · {project.address}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {formatDate(project.plannedStartDate)} — {formatDate(project.plannedEndDate)}
                    </span>
                    <Badge variant={project.status === 'completed' ? 'success' : 'outline'}>
                      {projectStatuses[project.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <nav aria-label="Страницы объектов" className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={offset === 0 || query.isFetching}
              onClick={() => onPageChange(Math.max(0, offset - projectPageSize))}
            >
              Назад
            </Button>
            <span className="text-sm">
              Страница {Math.floor(offset / projectPageSize) + 1} из{' '}
              {Math.max(1, Math.ceil(query.data.total / projectPageSize))}
            </span>
            <Button
              variant="outline"
              disabled={offset + projectPageSize >= query.data.total || query.isFetching}
              onClick={() => onPageChange(offset + projectPageSize)}
            >
              Далее
            </Button>
          </nav>
        </>
      )}
    </section>
  );
}
