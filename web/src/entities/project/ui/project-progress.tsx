import { CheckIcon, ClipboardListIcon, HouseIcon, LayersIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';

interface ProjectProgressProperties {
  step: number;
  disabled: boolean;
  label?: string;
  onStepChange: (step: number) => void;
}

const steps = [
  { title: 'Объект', description: 'Адрес, сроки и документы', icon: HouseIcon },
  { title: 'Выбор этапов', description: 'Состав строительных работ', icon: LayersIcon },
  { title: 'Заполнение', description: 'Планы, мастера и чек-листы', icon: ClipboardListIcon },
];

export function ProjectProgress({ step, disabled, onStepChange, label = 'Шаги создания' }: ProjectProgressProperties) {
  return (
    <nav aria-label={label} className="min-w-0 self-start lg:sticky lg:top-6">
      <p className="mb-4 hidden font-semibold text-muted-foreground text-xs uppercase tracking-wider lg:block">
        Настройка объекта
      </p>
      <ol className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-3">
        {steps.map(({ title, description, icon: Icon }, index) => (
          <li key={title} className="min-w-0">
            <Button
              type="button"
              variant={step === index + 1 ? 'selected' : 'ghost'}
              className={cn(
                'h-auto min-h-16 w-full flex-col gap-2 px-2 py-3',
                'sm:flex-row sm:justify-start sm:px-3 lg:gap-3 lg:py-4',
              )}
              disabled={disabled}
              aria-label={`${index + 1}. ${title}`}
              aria-current={step === index + 1 ? 'step' : undefined}
              onClick={() => onStepChange(index + 1)}
            >
              {step > index + 1 ? <CheckIcon data-icon="inline-start" /> : <Icon data-icon="inline-start" />}
              <span className="flex min-w-0 flex-col gap-1 text-left">
                <span className="whitespace-normal text-xs sm:text-sm">{title}</span>
                <span className="hidden whitespace-normal font-normal text-xs opacity-70 lg:block">{description}</span>
              </span>
            </Button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

import { cn } from 'cn';
