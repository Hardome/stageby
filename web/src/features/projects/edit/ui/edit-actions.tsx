import { ArrowLeftIcon, ArrowRightIcon, SaveIcon } from 'lucide-react';

import type { useProjectNavigation } from '@entities/project';
import { Button } from '@shared/ui/button';
import { Spinner } from '@shared/ui/spinner';

import type { useProjectUpdate } from '../lib/use-project-update';

interface EditActionsProperties {
  screen: 'object' | 'selection' | number;
  isLocked: boolean;
  hasUnfinishedUploads: boolean;
  update: ReturnType<typeof useProjectUpdate>;
  reloading: boolean;
  onCancel: () => void;
  navigation: ReturnType<typeof useProjectNavigation>;
}
export function EditActions({
  screen,
  isLocked,
  hasUnfinishedUploads,
  update,
  reloading,
  onCancel,
  navigation,
}: EditActionsProperties) {
  const { nextLabel } = navigation;

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Button
        type="button"
        variant="ghost"
        className="order-2 w-full sm:order-none sm:w-auto"
        disabled={update.isPending || reloading}
        onClick={onCancel}
      >
        Отмена
      </Button>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {screen !== 'object' && (
          <Button
            type="button"
            variant="ghost"
            className="flex-1 sm:flex-none"
            disabled={isLocked}
            onClick={navigation.back}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Назад
          </Button>
        )}
        {nextLabel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            disabled={isLocked}
            onClick={() => void navigation.next()}
          >
            {nextLabel}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1 sm:flex-none"
          disabled={isLocked || hasUnfinishedUploads || update.needsReload}
        >
          {update.isPending ? <Spinner data-icon="inline-start" /> : <SaveIcon data-icon="inline-start" />}
          {update.isPending ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
