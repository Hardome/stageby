import { PlusIcon, RotateCcwIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';

interface AdditionalStageActionProperties {
  disabled: boolean;
  isRestoring: boolean;
  onAdd: () => void;
}

export function AdditionalStageAction({ disabled, isRestoring, onAdd }: AdditionalStageActionProperties) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto min-h-12 w-full py-3 sm:w-auto sm:self-start"
      disabled={disabled}
      onClick={onAdd}
    >
      {isRestoring ? <RotateCcwIcon data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
      <span className="min-w-0 whitespace-normal">
        {isRestoring ? 'Восстановить дополнительный этап' : 'Добавить дополнительный этап'}
      </span>
    </Button>
  );
}
