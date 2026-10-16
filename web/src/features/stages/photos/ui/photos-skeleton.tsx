import { Skeleton } from '@shared/ui/skeleton';

export function PhotosSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-hidden="true">
      {[1, 2, 3].map((id) => (
        <Skeleton key={id} className="aspect-square w-full rounded-xl" />
      ))}
    </div>
  );
}
