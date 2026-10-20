import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from 'cn';
import { XIcon } from 'lucide-react';

import { Button } from './button';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

interface DialogHeaderProperties {
  title: string;
  description?: string;
  pending?: boolean;
}

export function DialogHeader({ title, description, pending = false }: DialogHeaderProperties) {
  return (
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b p-4 sm:p-5">
      <DialogTitle className="font-bold text-xl">{title}</DialogTitle>
      <DialogClose render={<Button variant="ghost" size="icon-sm" disabled={pending} aria-label="Закрыть" />}>
        <XIcon />
      </DialogClose>
      {description && (
        <DialogDescription className="wrap-anywhere col-span-2 text-muted-foreground text-sm">
          {description}
        </DialogDescription>
      )}
    </header>
  );
}

interface DialogContentProperties extends DialogPrimitive.Popup.Props {
  fullscreen?: boolean;
}

export function DialogBody({ className, ...properties }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-5', className)} {...properties} />
  );
}

export function DialogFooter({ className, ...properties }: React.ComponentProps<'footer'>) {
  return (
    <footer
      className={cn(
        'mt-auto grid shrink-0 grid-cols-2 gap-2 border-t bg-card p-4 sm:flex sm:flex-wrap sm:justify-end sm:p-5',
        'pb-[max(1rem,env(safe-area-inset-bottom))] max-sm:*:only:col-span-full',
        'max-sm:*:data-[slot=button]:h-auto max-sm:*:data-[slot=button]:min-h-12 max-sm:*:data-[slot=button]:min-w-0',
        'max-sm:*:data-[slot=button]:whitespace-normal',
        'max-sm:*:data-[slot=button]:px-5 max-sm:*:data-[slot=button]:py-3',
        className,
      )}
      {...properties}
    />
  );
}

export function DialogContent({ className, children, fullscreen = false, ...properties }: DialogContentProperties) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className={cn(
          'fixed inset-0 z-50 bg-surface-inverse/40 supports-backdrop-filter:backdrop-blur-xs',
          'data-open:fade-in-0 data-closed:fade-out-0 data-closed:animate-out data-open:animate-in',
          'duration-200 ease-out motion-reduce:animate-none',
        )}
      />
      <DialogPrimitive.Viewport
        className={cn('fixed inset-0 z-50 flex w-screen items-center justify-center', !fullscreen && 'sm:p-6')}
      >
        <DialogPrimitive.Popup
          className={cn(
            'flex h-dvh w-full flex-col overflow-hidden bg-card text-card-foreground outline-none',
            'data-open:fade-in-0 data-closed:fade-out-0 data-closed:animate-out data-open:animate-in',
            'duration-200 ease-out motion-reduce:animate-none',
            !fullscreen && 'data-open:zoom-in-[0.98] data-closed:zoom-out-[0.98]',
            !fullscreen && 'sm:h-auto sm:max-h-[min(90dvh,800px)] sm:max-w-2xl sm:rounded-2xl sm:border sm:shadow-lg',
            className,
          )}
          {...properties}
        >
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}
