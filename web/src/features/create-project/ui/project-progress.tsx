import { CheckIcon } from 'lucide-react';

import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';

interface ProjectProgressProperties {
  step: number;
  disabled: boolean;
  onStepChange: (step: number) => void;
}

export function ProjectProgress({ step, disabled, onStepChange }: ProjectProgressProperties) {
  return (
    <ol className="flex flex-col gap-3 sm:flex-row" aria-label="Шаги создания">
      {['Объект', 'Выбор этапов', 'Заполнение'].map((label, index) => (
        <li key={label} className="min-w-0 flex-1">
          <Button
            type="button"
            variant="outline"
            className="h-auto min-h-12 w-full justify-start gap-2 p-3"
            disabled={disabled}
            aria-label={`${index + 1}. ${label}`}
            aria-current={step === index + 1 ? 'step' : undefined}
            onClick={() => onStepChange(index + 1)}
          >
            <Badge variant={step === index + 1 ? 'default' : 'secondary'}>
              {step > index + 1 ? <CheckIcon /> : index + 1}
            </Badge>
            <span>{label}</span>
          </Button>
        </li>
      ))}
    </ol>
  );
}
