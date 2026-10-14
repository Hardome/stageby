import { cn } from 'cn';
import { CircleAlertIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';

import type { ProjectStageNavigationProperties } from '../model/navigation';

export function ProjectStageNavigation({
  stages,
  currentStage,
  disabled,
  onStageChange,
}: ProjectStageNavigationProperties) {
  return (
    <ol className="flex min-w-0 flex-col gap-1" aria-label="Этапы проекта">
      {stages.map((stage, position) => (
        <li key={stage.index}>
          <Button
            type="button"
            variant={currentStage === stage.index ? 'selected' : 'ghost'}
            className="h-auto min-h-12 w-full justify-start gap-3 px-3 py-3"
            aria-label={`Этап ${position + 1}. ${stage.title}${stage.hasError ? '. Есть ошибки' : ''}`}
            aria-current={currentStage === stage.index ? 'step' : undefined}
            disabled={disabled}
            onClick={() => onStageChange(stage.index)}
          >
            <span aria-hidden="true" className="w-5 shrink-0 text-center text-xs tabular-nums opacity-60">
              {String(position + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0 flex-1 whitespace-normal text-left font-semibold text-sm">{stage.title}</span>
            {stage.hasError && (
              <CircleAlertIcon
                aria-hidden="true"
                data-icon="inline-end"
                className={cn(currentStage !== stage.index && 'text-destructive')}
              />
            )}
          </Button>
        </li>
      ))}
    </ol>
  );
}
