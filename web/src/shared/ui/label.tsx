import type * as React from 'react';

import { cn } from 'cn';

function Label({ className, htmlFor, children, ...properties }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      htmlFor={htmlFor}
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium select-none',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        className,
      )}
      {...properties}
    >
      {children}
    </label>
  );
}

export { Label };
