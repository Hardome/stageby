import { Skeleton } from '@shared/ui/skeleton';

export function UserLoading() {
  return (
    <div className="flex flex-col gap-4" aria-live="polite">
      <span className="sr-only">Загружаем пользователя…</span>
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
