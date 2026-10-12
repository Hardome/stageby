import { Controller, useFormContext } from 'react-hook-form';

import { Alert, AlertDescription } from '@shared/ui/alert';
import { Checkbox } from '@shared/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from '@shared/ui/field';

import type { useDocuments } from '../lib/use-documents';
import type { ProjectFormValues } from '../model/types';
import { DocumentPicker } from './document-picker';
import { ProjectDateField } from './project-date-field';
import { ProjectField } from './project-field';
import { StageEditor } from './stage-editor';

interface ObjectStepProperties {
  isLocked: boolean;
  uploads: ReturnType<typeof useDocuments>;
}

export function ObjectStep({ isLocked, uploads }: ObjectStepProperties) {
  return (
    <FieldGroup>
      <ProjectField name="ownerName" label="Клиент" required maxLength={150} autoComplete="name" disabled={isLocked} />
      <ProjectField name="address" label="Адрес" required autoComplete="street-address" disabled={isLocked} />
      <ProjectField name="coordinates" label="Координаты" required placeholder="55.7558, 37.6176" disabled={isLocked} />
      <FieldGroup className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        <ProjectDateField name="plannedStartDate" label="Начало проекта" required disabled={isLocked} />
        <ProjectDateField name="plannedEndDate" label="Окончание проекта" required disabled={isLocked} />
      </FieldGroup>
      <DocumentPicker
        documents={uploads.documents}
        error={uploads.error}
        disabled={isLocked}
        onSelect={uploads.select}
        onReject={uploads.setError}
        onRetry={(document) => void uploads.retry(document)}
        onRemove={uploads.remove}
      />
    </FieldGroup>
  );
}

interface StagesStepProperties {
  stages: Pick<ProjectFormValues['stages'][number], 'type' | 'title' | 'enabled'>[];
  isLocked: boolean;
  registerErrorGroup: (element: HTMLElement | null) => void;
}

export function StagesStep({ stages, isLocked, registerErrorGroup }: StagesStepProperties) {
  const {
    control,
    clearErrors,
    formState: { errors },
  } = useFormContext<ProjectFormValues>();
  const stagesError = errors.stages?.root ?? errors.stages;
  return (
    <FieldSet>
      {stagesError?.message && <FieldError id="project-stages-error">{stagesError.message}</FieldError>}
      <FieldGroup>
        {stages.map((stage, index) => (
          <Field
            key={stage.type}
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
                  disabled={isLocked}
                  aria-invalid={Boolean(stagesError?.message)}
                  aria-describedby={stagesError?.message ? 'project-stages-error' : undefined}
                  aria-label={`Включить этап «${stage.title}»`}
                />
              )}
            />
            <FieldLabel htmlFor={`include-${stage.type}`}>{stage.title}</FieldLabel>
          </Field>
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
