import type * as React from 'react';

import { cn } from 'cn';

function Card({
  className,
  size = 'default',
  ...properties
}: React.ComponentProps<'div'> & { size?: 'default' | 'sm' }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        'group/card @container/card flex flex-col gap-(--card-spacing) overflow-hidden',
        'rounded-(--radius-card) border bg-card',
        'py-(--card-spacing) text-sm text-card-foreground',
        '[--card-spacing:--spacing(4)] has-[>img:first-child]:pt-0',
        'has-data-[slot=card-footer]:pb-0 data-[size=sm]:has-data-[slot=card-footer]:pb-0',
        'data-[size=sm]:[--card-spacing:--spacing(3)] *:[img:first-child]:rounded-t-(--radius-card)',
        '*:[img:last-child]:rounded-b-(--radius-card)',
        className,
      )}
      {...properties}
    />
  );
}

function CardHeader({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'group/card-header @container/card-header grid min-w-0 auto-rows-min grid-cols-[minmax(0,1fr)]',
        'items-start gap-1',
        'rounded-t-(--radius-card) px-(--card-spacing)',
        '@lg/card:has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto]',
        'has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
        className,
      )}
      {...properties}
    />
  );
}

function CardTitle({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'min-w-0 font-heading text-lg leading-snug font-bold wrap-anywhere group-data-[size=sm]/card:text-sm',
        className,
      )}
      {...properties}
    />
  );
}

function CardDescription({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('min-w-0 text-sm wrap-anywhere text-muted-foreground', className)}
      {...properties}
    />
  );
}

function CardAction({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-1 mt-2 max-w-full min-w-0 self-start justify-self-start',
        '@lg/card:col-start-2 @lg/card:row-span-2 @lg/card:row-start-1 @lg/card:mt-0 @lg/card:justify-self-end',
        className,
      )}
      {...properties}
    />
  );
}

function CardContent({ className, ...properties }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-(--card-spacing)', className)} {...properties} />;
}

function CardFooter({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center rounded-b-(--radius-card) border-t bg-card p-(--card-spacing)', className)}
      {...properties}
    />
  );
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
