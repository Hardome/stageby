import { cn } from 'cn';
import { CheckIcon, ClipboardListIcon, HouseIcon, LayersIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';

import type { ProjectStageNavigationProperties } from '../model/navigation';
import { ProjectStageDrawer } from './project-stage-drawer';
import { ProjectStageNavigation } from './project-stage-navigation';

interface ProjectProgressProperties extends ProjectStageNavigationProperties {
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

export function ProjectProgress({
  step,
  onStepChange,
  label = 'Шаги создания',
  ...stageNavigation
}: ProjectProgressProperties) {
  const { disabled, stages } = stageNavigation;

  return (
    <nav aria-label={label} className="w-full min-w-0 self-start lg:sticky lg:top-6">
      <ol className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-3">
        {steps.map(({ title, description, icon: Icon }, index) => (
          <li key={title} className="min-w-0">
            <Button
              type="button"
              variant={step === index + 1 ? 'selected' : 'ghost'}
              className={cn(
                'h-full min-h-16 w-full flex-col justify-start gap-2 px-2 py-3',
                'has-data-[icon=inline-start]:pl-2 sm:has-data-[icon=inline-start]:pl-3',
                'sm:flex-row sm:justify-start sm:px-3 lg:h-auto lg:gap-3 lg:py-4',
              )}
              disabled={disabled}
              aria-label={`${index + 1}. ${title}`}
              aria-current={step === index + 1 ? 'step' : undefined}
              onClick={() => onStepChange(index + 1)}
            >
              {step > index + 1 ? <CheckIcon data-icon="inline-start" /> : <Icon data-icon="inline-start" />}
              <span className="flex min-w-0 max-w-full flex-col gap-1 text-center sm:text-left">
                <span className="wrap-anywhere whitespace-normal text-xs sm:text-sm">{title}</span>
                <span className="hidden whitespace-normal font-normal text-xs opacity-70 lg:block">{description}</span>
              </span>
            </Button>
            {index === 2 && stages.length > 0 && (
              <div
                className={cn(
                  'mt-3 ml-5 hidden min-h-12 overflow-y-auto border-l pl-2 lg:block',
                  'max-h-[calc(100dvh-22rem)]',
                )}
              >
                <ProjectStageNavigation {...stageNavigation} />
              </div>
            )}
          </li>
        ))}
      </ol>
      <ProjectStageDrawer {...stageNavigation} />
    </nav>
  );
}
