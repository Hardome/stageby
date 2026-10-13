import { Controller, useFormContext } from 'react-hook-form';

import { Alert, AlertDescription } from '@shared/ui/alert';
import { Checkbox } from '@shared/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLegend, FieldSet, FieldTitle } from '@shared/ui/field';
import { Label } from '@shared/ui/label';
import { Separator } from '@shared/ui/separator';

import type { useDocuments } from '../lib/use-documents';
import type { ProjectFormValues } from '../model/types';
import { DocumentPicker } from './document-picker';
import { ProjectDateField } from './project-date-field';
import { ProjectField } from './project-field';
import { StageEditor } from './stage-editor';

interface ObjectStepProperties {
  isLocked: boolean;
  uploads: ReturnType<typeof useDocuments>;
  children?: ReactNode;
}

export function ObjectStep({ isLocked, uploads, children }: ObjectStepProperties) {
  return (
    <FieldGroup className="gap-6">
      <FieldSet>
        <FieldLegend className="flex items-center gap-2">
          <MapPinIcon aria-hidden="true" className="size-4 text-primary-text" />
          Клиент и адрес
        </FieldLegend>
        <ProjectField
          name="ownerName"
          label="Клиент"
          required
          maxLength={150}
          autoComplete="name"
          disabled={isLocked}
        />
        <FieldGroup className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ProjectField name="address" label="Адрес" required autoComplete="street-address" disabled={isLocked} />
          <ProjectField
            name="coordinates"
            label="Координаты"
            required
            placeholder="55.7558, 37.6176"
            disabled={isLocked}
          />
        </FieldGroup>
      </FieldSet>
      <Separator />
      <FieldSet>
        <FieldLegend className="flex items-center gap-2">
          <CalendarDaysIcon aria-hidden="true" className="size-4 text-primary-text" />
          Сроки проекта
        </FieldLegend>
        <FieldGroup className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <ProjectDateField name="plannedStartDate" label="Начало проекта" required disabled={isLocked} />
          <ProjectDateField name="plannedEndDate" label="Окончание проекта" required disabled={isLocked} />
        </FieldGroup>
      </FieldSet>
      <Separator />
      <FieldGroup className="gap-3">
        <DocumentPicker
          documents={uploads.documents}
          error={uploads.error}
          disabled={isLocked}
          onSelect={uploads.select}
          onReject={uploads.setError}
          onRetry={(document) => void uploads.retry(document)}
          onRemove={uploads.remove}
        />
        {children}
      </FieldGroup>
    </FieldGroup>
  );
}

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

export function UnfinishedUploadsWarning() {
  return (
    <Alert>
      <AlertDescription>Завершите загрузку PDF или уберите файлы на шаге «Объект».</AlertDescription>
    </Alert>
  );
}

interface ProjectStepProperties extends ObjectStepProperties, StagesStepProperties {
  screen: 'object' | 'selection' | number;
}

export function ProjectStep({ screen, stages, isLocked, uploads, registerErrorGroup }: ProjectStepProperties) {
  const {
    formState: { errors },
  } = useFormContext<ProjectFormValues>();
  if (screen === 'object') return <ObjectStep isLocked={isLocked} uploads={uploads} />;
  if (screen === 'selection')
    return <StagesStep stages={stages} isLocked={isLocked} registerErrorGroup={registerErrorGroup} />;
  return (
    <>
      {errors.stages?.[screen]?.message && <FieldError>{errors.stages[screen].message}</FieldError>}
      <StageEditor
        key={stages[screen]?.type}
        index={screen}
        disabled={isLocked}
        registerErrorGroup={registerErrorGroup}
      />
    </>
  );
}

import type { ReactNode } from 'react';

import { cn } from 'cn';
import { CalendarDaysIcon, MapPinIcon } from 'lucide-react';
