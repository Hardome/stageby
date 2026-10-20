import { FileTextIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';

export function ProjectDocumentsCardSkeleton() {
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
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  );
}
