import type * as React from 'react';

import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';
import { cn } from 'cn';

import { Button } from '@shared/ui/button';

function AlertDialog({ ...properties }: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...properties} />;
}

function AlertDialogTrigger({ ...properties }: AlertDialogPrimitive.Trigger.Props) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...properties} />;
}

function AlertDialogPortal({ ...properties }: AlertDialogPrimitive.Portal.Props) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...properties} />;
}

function AlertDialogOverlay({ className, ...properties }: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        [
          'data-open:fade-in-0 data-closed:fade-out-0 fixed inset-0 isolate z-50 bg-surface-inverse/40',
          'duration-100 data-closed:animate-out data-open:animate-in',
          'supports-backdrop-filter:backdrop-blur-xs',
        ],
        className,
      )}
      {...properties}
    />
  );
}

function AlertDialogContent({
  className,
  size = 'default',
  ...properties
}: AlertDialogPrimitive.Popup.Props & {
  size?: 'default' | 'sm';
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          [
            'group/alert-dialog-content data-open:fade-in-0 data-open:zoom-in-95',
            'data-closed:fade-out-0 data-closed:zoom-out-95 fixed top-1/2 left-1/2 z-50 grid w-max',
            '-translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4',
            'text-popover-foreground outline-none ring-1 ring-foreground/10 duration-100',
            'max-w-[calc(100vw-2rem)] data-[size=sm]:max-w-xs data-closed:animate-out data-open:animate-in',
          ],
          className,
        )}
        {...properties}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        [
          'grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center',
          'has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr]',
          'has-data-[slot=alert-dialog-media]:gap-x-4',
          'sm:group-data-[size=default]/alert-dialog-content:place-items-start',
          'sm:group-data-[size=default]/alert-dialog-content:text-left',
          'sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]',
        ],
        className,
      )}
      {...properties}
    />
  );
}

function AlertDialogFooter({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        [
          '-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4',
          '*:h-auto *:min-h-12 *:min-w-0 *:max-w-full *:whitespace-normal *:py-2.5 sm:*:whitespace-nowrap',
          'group-data-[size=sm]/alert-dialog-content:grid',
          'group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:grid sm:grid-cols-2',
        ],
        className,
      )}
      {...properties}
    />
  );
}

function AlertDialogMedia({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        [
          'mb-2 inline-flex size-10 items-center justify-center rounded-md bg-muted',
          'sm:group-data-[size=default]/alert-dialog-content:row-span-2',
          "*:[svg:not([class*='size-'])]:size-6",
        ],
        className,
      )}
      {...properties}
    />
  );
}

function AlertDialogTitle({ className, ...properties }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        [
          'font-heading font-medium text-base',
          'sm:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2',
        ],
        className,
      )}
      {...properties}
    />
  );
}

function AlertDialogDescription({
  className,
  ...properties
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(
        [
          'text-balance text-muted-foreground text-sm md:text-pretty *:[a]:underline',
          '*:[a]:underline-offset-3 *:[a]:hover:text-foreground',
        ],
        className,
      )}
      {...properties}
    />
  );
}

function AlertDialogAction({ className, ...properties }: React.ComponentProps<typeof Button>) {
  return <Button data-slot="alert-dialog-action" className={cn(className)} {...properties} />;
}

interface AlertDialogCancelProperties extends AlertDialogPrimitive.Close.Props {
  variant?: React.ComponentProps<typeof Button>['variant'];
  size?: React.ComponentProps<typeof Button>['size'];
}

function AlertDialogCancel({
  className,
  variant = 'outline',
  size = 'default',
  ...properties
}: AlertDialogCancelProperties) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...properties}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
