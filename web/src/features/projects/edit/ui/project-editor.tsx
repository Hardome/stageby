import { ProjectFormSkeleton } from '@entities/project';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { NotFound } from '@shared/ui/not-found';

import { useProjectEditor } from '../lib/use-project-editor';
import type { EditProjectFormProperties } from '../model/types';
import { EditProjectForm } from './edit-project-form';

interface ProjectEditorProperties extends Omit<EditProjectFormProperties, 'snapshot' | 'onReload'> {
  projectId: number;
}

export function ProjectEditor({ projectId, ...properties }: Readonly<ProjectEditorProperties>) {
  const { query, snapshot, revision, reload } = useProjectEditor(projectId, properties.onDirtyChange);

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
