import { cn } from 'cn';
import { tv, type VariantProps } from 'tailwind-variants';

function Empty({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-3 text-balance',
        'rounded-xl border-dashed p-4 text-center',
        className,
      )}
      {...properties}
    />
  );
}

function EmptyHeader({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-header"
      className={cn('flex max-w-sm flex-col items-center gap-2', className)}
      {...properties}
    />
  );
}

const emptyMediaVariants = tv({
  base: 'mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
  variants: {
    variant: {
      default: 'bg-transparent',
      icon: [
        'flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground',
        "[&_svg:not([class*='size-'])]:size-4",
      ],
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

function EmptyMedia({
  className,
  variant = 'default',
  ...properties
}: React.ComponentProps<'div'> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...properties}
    />
  );
}

function EmptyTitle({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-title"
      className={cn('font-heading font-medium text-sm tracking-tight', className)}
      {...properties}
    />
  );
}

function EmptyDescription({ className, ...properties }: React.ComponentProps<'p'>) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        'text-muted-foreground text-sm/relaxed [&>a:hover]:text-primary-text [&>a]:underline [&>a]:underline-offset-4',
        className,
      )}
      {...properties}
    />
  );
}

function EmptyContent({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn('flex w-full min-w-0 max-w-sm flex-col items-center gap-2.5 text-balance text-sm', className)}
      {...properties}
    />
  );
}

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle };
