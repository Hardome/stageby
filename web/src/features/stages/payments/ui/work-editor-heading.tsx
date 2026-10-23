import { DialogHeader } from '@shared/ui/dialog';

import type { WorkEditorProperties } from '../model/types';

interface WorkEditorHeadingProperties {
  action: WorkEditorProperties['action'];
  stage: WorkEditorProperties['stage'];
  pending: boolean;
}

export function WorkEditorHeading({ action, stage, pending }: Readonly<WorkEditorHeadingProperties>) {
  const title = action.kind === 'delete-payment' ? 'Удалить выплату?' : 'Выплата за работы';
  const description =
    action.kind === 'payment'
      ? `Получатель: ${action.payment?.recipient.fullName ?? stage.assignee?.fullName ?? 'Мастер не назначен'}`
      : undefined;

  return <DialogHeader title={title} description={description} pending={pending} />;
}
