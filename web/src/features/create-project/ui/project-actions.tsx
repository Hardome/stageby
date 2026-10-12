import { ArrowLeftIcon, ArrowRightIcon, HousePlusIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';
import { Spinner } from '@shared/ui/spinner';

interface ProjectActionsProperties {
  step: number;
  isPending: boolean;
  isLocked: boolean;
  hasSnapshot: boolean;
  hasConflict: boolean;
  hasUnfinishedUploads: boolean;
  onCancel: () => void;
  onBack: () => void;
}

export function ProjectActions({
  step,
  isPending,
  isLocked,
  hasSnapshot,
  hasConflict,
  hasUnfinishedUploads,
  onCancel,
  onBack,
}: ProjectActionsProperties) {
  let label = step === 1 ? 'Далее' : 'Создать';
  if (hasSnapshot) label = 'Повторить';
  if (isPending) label = 'Создание…';
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
        Отмена
      </Button>
      <div className="flex flex-col gap-3 sm:flex-row">
        {step === 2 && (
          <Button type="button" variant="outline" onClick={onBack} disabled={isLocked}>
            <ArrowLeftIcon data-icon="inline-start" />
            Назад
          </Button>
        )}
        {!hasConflict && (
          <Button type="submit" disabled={isPending || (step === 2 && hasUnfinishedUploads)}>
            {isPending && <Spinner data-icon="inline-start" />}
            {!isPending && step === 2 && <HousePlusIcon data-icon="inline-start" />}
            {label}
            {step === 1 && <ArrowRightIcon data-icon="inline-end" />}
          </Button>
        )}
      </div>
    </div>
  );
}
