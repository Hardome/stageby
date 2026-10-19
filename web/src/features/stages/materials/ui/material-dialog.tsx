import type { ReactNode } from 'react';

import { Dialog, DialogContent, DialogHeader } from '@shared/ui/dialog';

interface MaterialDialogProperties {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  pending: boolean;
  title: string;
  description?: string;
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
        <DialogHeader title={title} description={description} pending={pending} />
        {children}
      </DialogContent>
    </Dialog>
  );
}
