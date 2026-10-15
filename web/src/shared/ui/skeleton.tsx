import { cn } from 'cn';

function Skeleton({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('rounded-md bg-skeleton motion-safe:animate-pulse', className)}
      {...properties}
    />
  );
}

export { Skeleton };
