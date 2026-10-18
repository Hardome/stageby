import { BanknoteIcon, Trash2Icon } from 'lucide-react';

import { DialogDescription, DialogTitle } from '@shared/ui/dialog';

import type { WorkEditorProperties } from '../model/types';

const presentation = {
  payment: {
    title: 'Платёж за работы',
    description: 'Зафиксируйте фактическую выплату. План останется прежним.',
    icon: BanknoteIcon,
  },
  'delete-payment': {
    title: 'Удалить платёж?',
    description: 'Фактические выплаты и остаток этапа пересчитаются.',
    icon: Trash2Icon,
  },
};

interface WorkEditorHeadingProperties {
  action: WorkEditorProperties['action'];
  stage: WorkEditorProperties['stage'];
}

export function WorkEditorHeading({ action, stage }: WorkEditorHeadingProperties) {
  const { title, description, icon: Icon } = presentation[action.kind];

  return (
    <div className="flex shrink-0 items-start gap-4 border-b bg-background p-4 sm:p-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-card text-primary-text">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <p className="font-semibold text-muted-foreground text-xs">Оплата работ · {stage.title}</p>
        <DialogTitle className="font-bold text-xl tracking-tight">{title}</DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm leading-relaxed">{description}</DialogDescription>
      </div>
    </div>
  );
}
