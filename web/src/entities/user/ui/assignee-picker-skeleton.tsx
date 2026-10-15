import { Skeleton } from '@shared/ui/skeleton';

export function AssigneePickerSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col">
      {[1, 2, 3].map((row) => (
        <div key={row} className="flex min-h-12 items-center px-2">
          <Skeleton className="h-5 w-48 max-w-full" />
        </div>
      ))}
    </div>
  );
}
