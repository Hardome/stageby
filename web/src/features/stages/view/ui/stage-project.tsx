import { FileTextIcon } from 'lucide-react';

import { ProjectDocument } from '@entities/project';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@shared/ui/empty';

import type { Stage } from '@api/types';

interface StageProjectProperties {
  stage: Stage;
}

export function StageProject({ stage }: StageProjectProperties) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2">
            <FileTextIcon className="size-5 text-primary-text" aria-hidden="true" />
            <span>Проект</span>
          </h2>
        </CardTitle>
        <CardDescription>Документация для выполнения работ</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {stage.projectDocumentFileIds.length === 0 ? (
          <Empty className="rounded-xl border border-dashed p-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileTextIcon />
              </EmptyMedia>
              <EmptyTitle>Проект не загружен</EmptyTitle>
              <EmptyDescription>Здесь появятся PDF с документацией объекта.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          stage.projectDocumentFileIds.map((fileId, index) => (
            <ProjectDocument key={fileId} fileId={fileId} number={index + 1} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
