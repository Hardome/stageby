import { PlusIcon, Trash2Icon } from 'lucide-react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { AssigneePicker } from '@entities/user';
import { Button } from '@shared/ui/button';
import { FieldDescription, FieldError, FieldGroup, FieldLegend, FieldSet } from '@shared/ui/field';

import type { ProjectFormValues } from '../model/types';
import { ProjectDateField } from './project-date-field';
import { ProjectField } from './project-field';

interface StageEditorProperties {
  index: number;
  disabled: boolean;
  registerErrorGroup: (element: HTMLElement | null) => void;
}

export function StageEditor({ index, disabled, registerErrorGroup }: StageEditorProperties) {
  const { control, setValue, getFieldState, formState } = useFormContext<ProjectFormValues>();
  const checklist = useFieldArray({ control, name: `stages.${index}.checklistItems` });
  const [start, end, assigneeName] = useWatch({
    control,
    name: ['plannedStartDate', 'plannedEndDate', `stages.${index}.assigneeName`],
    exact: true,
  });
  const checklistFieldError = getFieldState(`stages.${index}.checklistItems`, formState).error;
  const checklistError = checklistFieldError?.root ?? checklistFieldError;
  return (
    <FieldGroup className="gap-6 pb-3">
      <FieldGroup className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        <ProjectDateField
          name={`stages.${index}.plannedStartDate`}
          label="Начало этапа"
          min={start}
          max={end}
          disabled={disabled}
        />
        <ProjectDateField
          name={`stages.${index}.plannedEndDate`}
          label="Окончание этапа"
          min={start}
          max={end}
          disabled={disabled}
        />
        <Controller
          control={control}
          name={`stages.${index}.assigneeId`}
          render={({ field, fieldState }) => (
            <AssigneePicker
              id={`project-stages.${index}.assigneeId`}
              disabled={disabled}
              value={field.value === null ? null : { id: field.value, label: assigneeName }}
              onChange={(value) => {
                field.onChange(value?.id ?? null);
                setValue(`stages.${index}.assigneeName`, value?.label ?? '', { shouldDirty: true });
              }}
              onBlur={field.onBlur}
              ref={field.ref}
              error={fieldState.error?.message}
            />
          )}
        />
      </FieldGroup>
      <FieldGroup className="grid min-w-0 gap-4 md:grid-cols-2">
        <ProjectField
          name={`stages.${index}.plannedWorkAmount`}
          label="План работ, ₽"
          inputMode="numeric"
          placeholder="Не задан"
          disabled={disabled}
        />
        <ProjectField
          name={`stages.${index}.plannedMaterialAmount`}
          label="План материалов, ₽"
          inputMode="numeric"
          placeholder="Не задан"
          disabled={disabled}
        />
      </FieldGroup>
      <FieldSet
        ref={(element) => {
          registerErrorGroup(element);
        }}
        tabIndex={-1}
        aria-invalid={Boolean(checklistError?.message)}
        aria-describedby={checklistError?.message ? `checklist-${index}-error` : undefined}
      >
        <FieldLegend>Чек-лист</FieldLegend>
        <FieldDescription>
          Изменения действуют только для этого объекта. В этапе должен остаться хотя бы один пункт.
        </FieldDescription>
        {checklistError?.message && <FieldError id={`checklist-${index}-error`}>{checklistError.message}</FieldError>}
        <FieldGroup>
          {checklist.fields.map((item, itemIndex) => (
            <FieldSet key={item.id} className="min-w-0 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-sm">Пункт {itemIndex + 1}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={disabled}
                  aria-label={`Удалить пункт ${itemIndex + 1}`}
                  onClick={() => checklist.remove(itemIndex)}
                >
                  <Trash2Icon />
                </Button>
              </div>
              <FieldGroup>
                <ProjectField
                  name={`stages.${index}.checklistItems.${itemIndex}.title`}
                  label="Название пункта"
                  required
                  maxLength={500}
                  disabled={disabled}
                />
                <ProjectField
                  name={`stages.${index}.checklistItems.${itemIndex}.photoHint`}
                  label="Подсказка к фотографии"
                  maxLength={1000}
                  disabled={disabled}
                />
              </FieldGroup>
            </FieldSet>
          ))}
        </FieldGroup>
        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={disabled}
          onClick={() => checklist.append({ title: '', photoHint: '' })}
        >
          <PlusIcon data-icon="inline-start" />
          Добавить пункт
        </Button>
      </FieldSet>
    </FieldGroup>
  );
}
