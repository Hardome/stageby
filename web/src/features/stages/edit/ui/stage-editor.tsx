import { type ReactElement, type ReactNode, useState } from 'react';

import { PencilIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';
import { Dialog, DialogTrigger } from '@shared/ui/dialog';

import type { Stage } from '@api/types';

import { StageParameters } from './stage-parameters';

interface StageEditorProperties {
  stage: Stage;
  defaultOpen?: boolean;
  trigger?: ReactElement<{ children?: ReactNode }>;
  focusAssignee?: boolean;
}

export function StageEditor({ stage, defaultOpen = false, trigger, focusAssignee = false }: StageEditorProperties) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
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
      <DialogTrigger disabled={isReadOnly} render={trigger ?? <Button variant="outline" />}>
        {trigger ? (
          trigger.props.children
        ) : (
          <>
            <PencilIcon data-icon="inline-start" /> Редактировать этап
          </>
        )}
      </DialogTrigger>
      {isOpen && (
        <StageParameters
          stage={stage}
          focusAssignee={focusAssignee}
          onClose={() => setIsOpen(false)}
          onPendingChange={setIsPending}
        />
      )}
    </Dialog>
  );
}
