import { cn } from 'cn';
import { Controller, useFormContext } from 'react-hook-form';

import { Checkbox } from '@shared/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldSet, FieldTitle } from '@shared/ui/field';
import { Label } from '@shared/ui/label';

import type { ProjectFormValues } from '../model/types';

interface StagesStepProperties {
  stages: Pick<ProjectFormValues['stages'][number], 'type' | 'title' | 'enabled'>[];
  isLocked: boolean;
  registerErrorGroup: (element: HTMLElement | null) => void;
  exclusionReasons?: (string | undefined)[];
}

export function StagesStep({ stages, isLocked, registerErrorGroup, exclusionReasons }: StagesStepProperties) {
  const {
    control,
    clearErrors,
    formState: { errors },
  } = useFormContext<ProjectFormValues>();
  const stagesError = errors.stages?.root ?? errors.stages;

  return (
    <FieldSet>
      {stagesError?.message && <FieldError id="project-stages-error">{stagesError.message}</FieldError>}
      <FieldGroup className="gap-2">
        {stages.map((stage, index) => (
          <Label
            key={stage.type}
            htmlFor={`include-${stage.type}`}
            className={cn(
              'min-h-14 min-w-0 rounded-(--radius-control) border px-4 py-3 transition-colors',
              'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
              stage.enabled && 'border-control-border bg-muted',
              isLocked || (stage.enabled && typeof exclusionReasons?.[index] === 'string')
                ? 'cursor-not-allowed'
                : 'cursor-pointer hover:bg-muted',
            )}
          >
            <Field
              className="min-w-0 gap-3"
              orientation="horizontal"
              data-invalid={Boolean(stagesError?.message)}
              data-disabled={isLocked}
            >
              <Controller
                control={control}
                name={`stages.${index}.enabled`}
                render={({ field }) => (
                  <Checkbox
                    ref={(element) => {
                      field.ref(element);
                      if (index === 0) registerErrorGroup(element);
                    }}
                    id={`include-${stage.type}`}
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      clearErrors('stages');
                    }}
                    onBlur={field.onBlur}
                    disabled={isLocked || (stage.enabled && typeof exclusionReasons?.[index] === 'string')}
                    aria-invalid={Boolean(stagesError?.message)}
                    aria-describedby={stagesError?.message ? 'project-stages-error' : undefined}
                    aria-label={`Включить этап «${stage.title}»`}
                  />
                )}
              />
              <div className="flex flex-col gap-1">
                <FieldTitle>{stage.title}</FieldTitle>
                {stage.enabled && exclusionReasons?.[index] && (
                  <FieldDescription>{exclusionReasons[index]}</FieldDescription>
                )}
              </div>
            </Field>
          </Label>
        ))}
      </FieldGroup>
    </FieldSet>
  );
}
