import { cn } from 'cn';
import { Loader2Icon } from 'lucide-react';

function Spinner({ className, ...properties }: React.ComponentProps<'svg'>) {
  return (
    <Loader2Icon
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn('size-4 motion-safe:animate-spin', className)}
      {...properties}
    />
  );
}

export { Spinner };
