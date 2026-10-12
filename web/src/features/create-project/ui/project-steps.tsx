import { Controller, useFormContext } from 'react-hook-form';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@shared/ui/accordion';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Checkbox } from '@shared/ui/checkbox';
import { FieldDescription, FieldError, FieldGroup } from '@shared/ui/field';

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
      <ProjectField name="ownerName" label="Клиент *" maxLength={150} autoComplete="name" disabled={isLocked} />
      <ProjectField name="address" label="Адрес *" autoComplete="street-address" disabled={isLocked} />
      <ProjectField name="coordinates" label="Координаты *" placeholder="55.7558, 37.6176" disabled={isLocked} />
      <FieldGroup className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        <ProjectDateField name="plannedStartDate" label="Начало проекта *" disabled={isLocked} />
        <ProjectDateField name="plannedEndDate" label="Окончание проекта *" disabled={isLocked} />
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
  opened: string[];
  onOpenedChange: (values: string[]) => void;
  isLocked: boolean;
  hasUnfinishedUploads: boolean;
}

export function StagesStep({ stages, opened, onOpenedChange, isLocked, hasUnfinishedUploads }: StagesStepProperties) {
  const {
    control,
    formState: { errors },
  } = useFormContext<ProjectFormValues>();
  const stagesError = errors.stages?.root ?? errors.stages;
  return (
    <FieldGroup>
      <FieldDescription>Даты этапов могут пересекаться. Мастера и плановые суммы можно указать позже.</FieldDescription>
      {stagesError?.message && <FieldError id="project-stages-error">{stagesError.message}</FieldError>}
      <Accordion
        multiple
        value={opened}
        onValueChange={(values) => onOpenedChange(values as string[])}
        aria-describedby={stagesError?.message ? 'project-stages-error' : undefined}
      >
        {stages.map((stage, index) => (
          <AccordionItem key={stage.type} value={stage.type}>
            <div className="flex min-w-0 items-center gap-3 py-2">
              <Controller
                control={control}
                name={`stages.${index}.enabled`}
                render={({ field }) => (
                  <Checkbox
                    id={`include-${stage.type}`}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLocked}
                    aria-label={`Включить этап «${stage.title}»`}
                  />
                )}
              />
              <div className="min-w-0 flex-1">
                <AccordionTrigger
                  className="min-h-12 w-full gap-3"
                  aria-describedby={errors.stages?.[index]?.message ? `stage-${index}-error` : undefined}
                >
                  <span className="wrap-anywhere text-base">
                    {index + 1}. {stage.title}
                  </span>
                </AccordionTrigger>
              </div>
              {errors.stages?.[index] && <Badge variant="destructive">Ошибка</Badge>}
            </div>
            <AccordionContent>
              {errors.stages?.[index]?.message && (
                <FieldError id={`stage-${index}-error`}>{errors.stages[index].message}</FieldError>
              )}
              {stage.enabled ? (
                <StageEditor index={index} disabled={isLocked} />
              ) : (
                <FieldDescription>Этап исключён и не будет создан.</FieldDescription>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {hasUnfinishedUploads && (
        <Alert>
          <AlertDescription>Завершите загрузку PDF или уберите файлы на шаге «Объект».</AlertDescription>
        </Alert>
      )}
    </FieldGroup>
  );
}
