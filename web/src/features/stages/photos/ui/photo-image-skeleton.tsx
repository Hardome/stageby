import { Skeleton } from '@shared/ui/skeleton';
import { Spinner } from '@shared/ui/spinner';

export function PhotoImageSkeleton() {
  return (
    <div className="relative">
      <Skeleton className="aspect-square w-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Spinner className="size-6" aria-label="Загрузка фотографии" />
      </div>
    </div>
  );
}
