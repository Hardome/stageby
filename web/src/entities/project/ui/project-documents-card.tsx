import { FileTextIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@shared/ui/empty';

import { ProjectDocument } from './project-document';

interface ProjectDocumentsCardProperties {
  fileIds: number[];
}

export function ProjectDocumentsCard({ fileIds }: Readonly<ProjectDocumentsCardProperties>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2">
            <FileTextIcon className="size-5 text-primary-text" aria-hidden="true" />
            Проект
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {fileIds.length === 0 ? (
          <Empty className="rounded-xl border border-dashed p-4">
            <EmptyHeader>
              <EmptyTitle>Проект не загружен</EmptyTitle>
              <EmptyDescription>Здесь появятся PDF с документацией объекта.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          fileIds.map((fileId, index) => <ProjectDocument key={fileId} fileId={fileId} number={index + 1} />)
        )}
      </CardContent>
    </Card>
  );
}
