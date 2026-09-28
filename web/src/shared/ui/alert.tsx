import type * as React from 'react';

import { cn } from 'cn';
import { tv, type VariantProps } from 'tailwind-variants';

const alertVariants = tv({
  base: [
    'group/alert relative grid w-full gap-1 rounded-(--radius-status-panel) border p-4.5 text-left text-sm',
    'has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18',
    'has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2',
    "*:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  ],
  variants: {
    variant: {
      success: [
        'border-success-border bg-success-subtle text-success',
        '*:data-[slot=alert-description]:text-success *:[svg]:text-current',
      ],
      default: 'bg-card text-card-foreground',
      destructive: [
        'border-destructive-border bg-destructive-subtle text-destructive',
        '*:data-[slot=alert-description]:text-destructive *:[svg]:text-current',
      ],
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

function Alert({
  className,
  variant,
  ...properties
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...properties} />;
}

function AlertTitle({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'font-bold group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3',
        '[&_a]:hover:text-foreground',
        className,
      )}
      {...properties}
    />
  );
}

function AlertDescription({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-balance text-muted-foreground text-sm md:text-pretty [&_a]:underline',
        '[&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4',
        className,
      )}
      {...properties}
    />
  );
}

function AlertAction({ className, ...properties }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-action" className={cn('absolute top-2 right-2', className)} {...properties} />;
}

export { Alert, AlertAction, AlertDescription, AlertTitle };
