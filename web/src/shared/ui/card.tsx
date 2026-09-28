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
        'group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-(--radius-card) border bg-card',
        'py-(--card-spacing) text-card-foreground text-sm',
        '[--card-spacing:--spacing(5)] has-[>img:first-child]:pt-0',
        'has-data-[slot=card-footer]:pb-0 data-[size=sm]:has-data-[slot=card-footer]:pb-0',
        'data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-(--radius-card)',
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
        'group/card-header @container/card-header grid auto-rows-min items-start gap-1',
        'rounded-t-(--radius-card) px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto]',
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
      className={cn('font-bold font-heading text-lg leading-snug group-data-[size=sm]/card:text-sm', className)}
      {...properties}
    />
  );
}

function CardDescription({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-description" className={cn('text-muted-foreground text-sm', className)} {...properties} />
  );
}

function CardAction({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
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
