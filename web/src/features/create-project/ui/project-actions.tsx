import { ArrowLeftIcon, ArrowRightIcon, HousePlusIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';
import { Spinner } from '@shared/ui/spinner';

interface ProjectActionsProperties {
  canCreate: boolean;
  hasBack: boolean;
  nextLabel?: string;
  isPending: boolean;
  isLocked: boolean;
  hasSnapshot: boolean;
  hasConflict: boolean;
  hasUnfinishedUploads: boolean;
  onCancel: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function ProjectActions({
  canCreate,
  hasBack,
  nextLabel,
  isPending,
  isLocked,
  hasSnapshot,
  hasConflict,
  hasUnfinishedUploads,
  onCancel,
  onBack,
  onNext,
}: ProjectActionsProperties) {
  const idleLabel = hasSnapshot ? 'Повторить' : 'Создать объект';
  const label = isPending ? 'Создание…' : idleLabel;
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
        Отмена
      </Button>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {hasBack && (
          <Button type="button" variant="outline" onClick={onBack} disabled={isLocked}>
            <ArrowLeftIcon data-icon="inline-start" />
            Назад
          </Button>
        )}
        {nextLabel && (
          <Button type="button" variant={canCreate ? 'outline' : 'default'} onClick={onNext} disabled={isLocked}>
            {nextLabel}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        )}
        {canCreate && !hasConflict && (
          <Button type="submit" disabled={isPending || hasUnfinishedUploads}>
            {isPending ? <Spinner data-icon="inline-start" /> : <HousePlusIcon data-icon="inline-start" />}
            {label}
          </Button>
        )}
      </div>
    </div>
  );
}
