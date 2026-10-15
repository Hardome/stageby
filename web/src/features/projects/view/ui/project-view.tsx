import { useEffect } from 'react';

import { FileTextIcon } from 'lucide-react';

import { ProjectDocument } from '@entities/project';
import { useAccessError } from '@shared/lib/hooks';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { DataRegion } from '@shared/ui/data-region';

import { useGetProject } from '@api/queries/useGetProject';
import { useListProjectStages } from '@api/queries/useListProjectStages';

import { ProjectFinances } from './project-finances';
import { ProjectHeader } from './project-header';
import { ProjectStages } from './project-stages';
import { ProjectUnavailable } from './project-unavailable';

interface ProjectViewProperties {
  projectId: number;
  onEdit?: () => void;
}

export function ProjectView({ projectId, onEdit }: ProjectViewProperties) {
  const project = useGetProject({ path: { projectId } }, { query: { retry: false } });
  const stages = useListProjectStages({ path: { projectId } }, { query: { retry: false } });
  const accessError = useAccessError();

  useEffect(() => {
    if (project.error) accessError(project.error);
  }, [project.error, accessError]);

  useEffect(() => {
    if (stages.error) accessError(stages.error);
  }, [stages.error, accessError]);

  if (!project.data) {
    return <ProjectUnavailable query={project} />;
  }
  const value = project.data;

  return (
    <div className="flex min-w-0 flex-col gap-5" aria-busy={project.isFetching || stages.isFetching}>
      <DataRegion isFetching={project.isFetching} label="Обновляем объект…">
        <div className="flex flex-col gap-5">
          <ProjectHeader project={value} onEdit={onEdit} />
          {project.isError && (
            <Alert variant="destructive">
              <AlertDescription>Не удалось обновить объект. Показаны ранее загруженные данные.</AlertDescription>
            </Alert>
          )}
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <ProjectFinances finances={value.finances} />
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>
                  <h2 className="flex items-center gap-2">
                    <FileTextIcon className="size-5 text-primary-text" aria-hidden="true" />
                    Проект (PDF)
                  </h2>
                </CardTitle>
                <CardDescription>Документация объекта</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {value.documentFileIds.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Документы не загружены</p>
                ) : (
                  value.documentFileIds.map((id, index) => <ProjectDocument key={id} fileId={id} number={index + 1} />)
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DataRegion>
      <ProjectStages
        stages={stages.data?.items}
        isPending={stages.isPending}
        isFetching={stages.isFetching}
        hasError={stages.isError}
        onRetry={() => void stages.refetch()}
      />
    </div>
  );
}
