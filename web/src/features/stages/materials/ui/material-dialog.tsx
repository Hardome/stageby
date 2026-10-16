import type { ReactNode } from 'react';

import { XIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@shared/ui/dialog';

interface MaterialDialogProperties {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  pending: boolean;
  title: string;
  description: string;
  trigger: ReactNode;
  children: ReactNode;
}

export function MaterialDialog({
  isOpen,
  onOpenChange,
  pending,
  title,
  description,
  trigger,
  children,
}: MaterialDialogProperties) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      {trigger}
      <DialogContent>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <DialogTitle className="font-bold text-xl">{title}</DialogTitle>
            <DialogDescription className="wrap-anywhere text-muted-foreground text-sm">{description}</DialogDescription>
          </div>
          <DialogClose render={<Button variant="ghost" size="icon-sm" disabled={pending} aria-label="Закрыть" />}>
            <XIcon />
          </DialogClose>
        </header>
        <div className="min-h-0 overflow-y-auto p-4 sm:p-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
