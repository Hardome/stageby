import { Card, CardContent, CardHeader } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';

export function MaterialsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1].map((key) => (
        <Card key={key}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-12 w-48" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
