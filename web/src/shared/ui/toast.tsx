import { Toast as ToastPrimitive } from '@base-ui/react/toast';
import { cn } from 'cn';
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon, XIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';

export const toast = ToastPrimitive.createToastManager();

const icons = {
  success: CircleCheckIcon,
  info: InfoIcon,
  warning: TriangleAlertIcon,
  error: OctagonXIcon,
  loading: Loader2Icon,
};

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();

  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport
        aria-label="Уведомления"
        className={cn(
          'fixed inset-x-4 top-20 z-50 mx-auto flex w-auto max-w-sm flex-col gap-2 outline-none',
          'sm:right-4 sm:left-auto sm:mx-0 sm:w-full',
        )}
      >
        {toasts.map((item) => {
          const Icon = icons[item.type as keyof typeof icons] ?? InfoIcon;

          return (
            <ToastPrimitive.Root
              key={item.id}
              toast={item}
              data-type={item.type}
              className={cn(
                'pointer-events-auto flex gap-3 rounded-lg border bg-popover p-3',
                item.description ? 'items-start' : 'items-center',
                'text-popover-foreground shadow-lg data-[type=error]:border-destructive-border',
                'data-[type=error]:bg-destructive-subtle data-[type=error]:text-destructive',
                'data-[type=success]:border-success-border data-[type=success]:bg-success-subtle',
                'data-[type=success]:text-success',
                '[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--toast-swipe-movement-y))]',
              )}
            >
              <Icon
                className={cn('size-5 shrink-0 data-[type=loading]:animate-spin', item.description && 'mt-0.5')}
                data-type={item.type}
                aria-hidden="true"
              />
              <ToastPrimitive.Content className="min-w-0 flex-1">
                <ToastPrimitive.Title className="wrap-anywhere font-medium text-sm" />
                {item.description && <ToastPrimitive.Description className="wrap-anywhere text-current text-sm" />}
                {item.actionProps && (
                  <ToastPrimitive.Action render={<Button variant="outline" size="sm" />} className="mt-2" />
                )}
              </ToastPrimitive.Content>
              <ToastPrimitive.Close
                render={<Button variant="ghost" size="icon" />}
                aria-label="Закрыть уведомление"
                className={cn('shrink-0', item.description ? 'size-8' : 'size-5')}
              >
                <XIcon aria-hidden="true" />
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  );
}

export function Toaster() {
  return (
    <ToastPrimitive.Provider toastManager={toast} timeout={5000}>
      <ToastList />
    </ToastPrimitive.Provider>
  );
}
