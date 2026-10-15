import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';

export function StageListCardSkeleton() {
  return (
    <Card className="min-w-0 gap-4">
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-3/5" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-5 w-4/5" />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-3/4" />
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {['План работ', 'Факт работ'].map((label) => (
            <div key={label} className="min-w-0">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>
                <Skeleton className="h-5 w-3/4" />
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-40" />
      </CardFooter>
    </Card>
  );
}
