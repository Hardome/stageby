import { PlusIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';

interface AdditionalStageActionProperties {
  disabled: boolean;
  onAdd: () => void;
}

export function AdditionalStageAction({ disabled, onAdd }: AdditionalStageActionProperties) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto min-h-12 w-full justify-start px-3 py-3"
      disabled={disabled}
      onClick={onAdd}
    >
      <PlusIcon data-icon="inline-start" />
      <span className="min-w-0 whitespace-normal">Доп. этап</span>
    </Button>
  );
}
