import { useEffect } from 'react';

import { errorStatus, useAccessError } from '@shared/lib/hooks';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@shared/ui/empty';
import { NotFound } from '@shared/ui/not-found';
import { Skeleton } from '@shared/ui/skeleton';

import { useListActiveStageTypes } from '@api/queries/useListActiveStageTypes';

import { CreateProjectForm } from './create-project-form';

interface ProjectCreatorProperties {
  onDirtyChange: (isDirty: boolean) => void;
  onCancel: () => void;
  onSuccess: () => Promise<void>;
}

export function ProjectCreator(properties: ProjectCreatorProperties) {
  const query = useListActiveStageTypes();
  const accessError = useAccessError();
  useEffect(() => {
    if (query.error) accessError(query.error);
  }, [query.error, accessError]);
  if (errorStatus(query.error) === 403 || errorStatus(query.error) === 404) return <NotFound />;
  if (query.data && query.data.length > 0) return <CreateProjectForm types={query.data} {...properties} />;
  if (query.isPending)
    return (
      <div role="status" aria-label="Загрузка формы" className="flex flex-col gap-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-96" />
      </div>
    );
  if (!query.isError)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Нет активных типов этапов</EmptyTitle>
          <EmptyDescription>Обратитесь к администратору для настройки справочника.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  return (
    <Alert variant="destructive">
      <AlertDescription>
        Не удалось загрузить шаблоны этапов.
        <Button
          type="button"
          variant="outline"
          className="mt-3"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Повторить загрузку
        </Button>
      </AlertDescription>
    </Alert>
  );
}
