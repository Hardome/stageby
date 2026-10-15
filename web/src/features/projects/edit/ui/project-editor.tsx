import { useEffect, useState } from 'react';

import { ProjectFormSkeleton } from '@entities/project';
import { useAccessError } from '@shared/lib/hooks';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { NotFound } from '@shared/ui/not-found';

import { useGetProjectEdit } from '@api/queries/useGetProjectEdit';
import type { ProjectEdit } from '@api/types';

import type { EditProjectFormProperties } from '../model/types';
import { EditProjectForm } from './edit-project-form';

interface ProjectEditorProperties extends Omit<EditProjectFormProperties, 'snapshot' | 'onReload'> {
  projectId: number;
}

export function ProjectEditor({ projectId, ...properties }: ProjectEditorProperties) {
  const query = useGetProjectEdit({ path: { projectId } }, { query: { retry: false, refetchOnMount: 'always' } });
  const [snapshot, setSnapshot] = useState<ProjectEdit | null>(null);
  const [revision, setRevision] = useState(0);
  const accessError = useAccessError();
  // При входе ждём свежий снимок; последующие обновления не заменяют правки и исходные версии.
  if (snapshot === null && query.isFetchedAfterMount && query.isSuccess && !query.isFetching) setSnapshot(query.data);

  useEffect(() => {
    if (query.error) accessError(query.error);
  }, [query.error, accessError]);

  async function reload() {
    const result = await query.refetch();
    if (result.error || !result.data) throw new Error('Не удалось загрузить объект.');
    setSnapshot(result.data);
    setRevision((previous) => previous + 1);
    properties.onDirtyChange(false);
  }

  if (query.error?.status === 403 || query.error?.status === 404) return <NotFound />;

  if (snapshot?.project.isArchived)
    return (
      <Alert>
        <AlertDescription>
          Объект в архиве. Редактирование недоступно.
          <Button variant="outline" onClick={properties.onCancel}>
            Вернуться к объекту
          </Button>
        </AlertDescription>
      </Alert>
    );
  if (snapshot)
    return (
      <DataRegion isFetching={query.isFetching} label="Обновляем объект…">
        {query.isError && (
          <Alert variant="destructive">
            <AlertDescription>Не удалось обновить данные объекта. Ваши правки сохранены в форме.</AlertDescription>
          </Alert>
        )}
        <EditProjectForm key={revision} snapshot={snapshot} onReload={reload} {...properties} />
      </DataRegion>
    );
  if (query.isPending || query.isFetching)
    return <DataRegion initialLabel="Загрузка редактора объекта" isLoading skeleton={<ProjectFormSkeleton />} />;
  const messages: Record<number, string> = {
    401: 'Сессия завершена. Войдите снова.',
  };

  return (
    <Alert variant="destructive">
      <AlertDescription>
        {messages[query.error?.status ?? 0] ?? 'Не удалось загрузить объект.'}
        <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
          Повторить загрузку
        </Button>
      </AlertDescription>
    </Alert>
  );
}
