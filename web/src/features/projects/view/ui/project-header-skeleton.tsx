import { Button } from '@shared/ui/button';
import { Skeleton } from '@shared/ui/skeleton';

export function ProjectHeaderSkeleton() {
  return (
    <header className="flex flex-col gap-6 border-b pb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
            Объект строительства
          </span>
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-9 w-56 max-w-full sm:h-10" />
        <Skeleton className="h-6 w-80 max-w-full" />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" disabled>
            Открыть на карте
          </Button>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          Координаты: <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid shrink-0 grid-cols-2 rounded-xl border bg-card text-card-foreground">
        {['Начало', 'Завершение'].map((label) => (
          <div key={label} className="flex flex-col gap-2 p-4 first:border-r sm:px-6">
            <span className="text-muted-foreground text-xs">{label}</span>
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    </header>
  );
}
