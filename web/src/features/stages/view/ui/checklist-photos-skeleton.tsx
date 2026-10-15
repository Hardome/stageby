import { Skeleton } from '@shared/ui/skeleton';

export function ChecklistPhotosSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2].map((photo) => (
        <Skeleton key={photo} className="aspect-[16/10] w-full rounded-xl" />
      ))}
    </div>
  );
}
