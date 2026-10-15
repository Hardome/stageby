import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';

export function UserCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-3/5" />
        </CardTitle>
        <Skeleton className="h-5 w-2/5" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          Телефон: <Skeleton className="h-5 w-32" />
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
      </CardFooter>
    </Card>
  );
}
