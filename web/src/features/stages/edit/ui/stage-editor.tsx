import { useState } from 'react';

import { PencilIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@shared/ui/dialog';

import type { Stage } from '@api/types';

import { StageParameters } from './stage-parameters';

interface StageEditorProperties {
  stage: Stage;
}

export function StageEditor({ stage }: StageEditorProperties) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const isReadOnly = stage.projectIsArchived || !stage.isIncluded;

  return (
    <Dialog
      open={isOpen}
      disablePointerDismissal
      onOpenChange={(value) => {
        if (!isPending) setIsOpen(value);
      }}
    >
      <DialogTrigger disabled={isReadOnly} render={<Button variant="outline" />}>
        <PencilIcon data-icon="inline-start" /> Редактировать этап
      </DialogTrigger>
      <DialogContent>
        {isOpen && <StageParameters stage={stage} onClose={() => setIsOpen(false)} onPendingChange={setIsPending} />}
      </DialogContent>
    </Dialog>
  );
}
