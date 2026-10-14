import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { cn } from 'cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogContent({ className, children, ...properties }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className={cn('fixed inset-0 z-50 bg-surface-inverse/40', 'supports-backdrop-filter:backdrop-blur-xs')}
      />
      <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex w-screen items-center justify-center sm:p-6">
        <DialogPrimitive.Popup
          className={cn(
            'flex h-dvh w-full flex-col overflow-hidden bg-card text-card-foreground outline-none',
            'sm:h-auto sm:max-h-[min(90dvh,800px)] sm:max-w-2xl sm:rounded-2xl sm:border sm:shadow-lg',
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
