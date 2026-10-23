import { useEffect } from 'react';

import { keepPreviousData } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { cn } from 'cn';

import { formatDate, projectStatuses } from '@entities/project';
import { useAccessError } from '@shared/lib/hooks';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@shared/ui/empty';
import { NotFound } from '@shared/ui/not-found';

import { useListProjects } from '@api/queries/useListProjects';

import { getProjectsQuery } from '../lib/project-search';
import { projectPageSize } from '../model/data';
import type { ProjectsSearch } from '../model/types';
import { ProjectListSkeleton } from './project-list-skeleton';

interface TemporaryProjectListProperties {
  search: ProjectsSearch;
  onPageChange: (offset: number, shouldReplace?: boolean) => void;
}

// Temporary: remove this feature and its HomePage connection when the manager dashboard is ready.
export function TemporaryProjectList({ search, onPageChange }: Readonly<TemporaryProjectListProperties>) {
  const query = useListProjects(
    { query: getProjectsQuery(search) },
    { query: { retry: false, placeholderData: keepPreviousData } },
  );
  const accessError = useAccessError();
  const offset = search.offset ?? 0;

  useEffect(() => {
    if (query.error) accessError(query.error);
  }, [query.error, accessError]);

  useEffect(() => {
    if (
      !query.error &&
      !query.isFetching &&
      !query.isPlaceholderData &&
      query.data &&
      offset > 0 &&
      offset >= query.data.total
    ) {
      onPageChange(Math.max(0, Math.ceil(query.data.total / projectPageSize) - 1) * projectPageSize, true);
    }
  }, [query.data, query.error, query.isFetching, query.isPlaceholderData, offset, onPageChange]);

  if (query.error?.status === 403 || query.error?.status === 404) return <NotFound />;

  return (
    <section aria-label="Объекты" aria-busy={query.isFetching} className="flex min-w-0 flex-col gap-4">
      <h2 className="text-xl font-semibold">Объекты</h2>
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
      <DataRegion
        initialLabel="Загрузка объектов"
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        isRefreshing={query.isPlaceholderData && query.isFetching}
        skeleton={<ProjectListSkeleton />}
        label="Обновляем список…"
      >
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
                        'flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-4',
                        'text-card-foreground hover:bg-muted focus-visible:outline-ring',
                      ])}
                    >
                      <span className="font-semibold break-words">
                        {project.ownerName} · {project.address}
                      </span>
                      <span className="text-sm text-muted-foreground">
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
      </DataRegion>
    </section>
  );
}
