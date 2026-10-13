import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  PlusIcon,
  Trash2Icon,
  WalletIcon,
} from 'lucide-react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { AssigneePicker } from '@entities/user/@x/project';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { FieldDescription, FieldError, FieldGroup, FieldLegend, FieldSet } from '@shared/ui/field';
import { Separator } from '@shared/ui/separator';

import type { ProjectFormValues } from '../model/types';
import { ProjectDateField } from './project-date-field';
import { ProjectField } from './project-field';
import { ProjectMoneyField } from './project-money-field';

interface StageEditorProperties {
  index: number;
  disabled: boolean;
  checklistReadOnly?: boolean;
  registerErrorGroup: (element: HTMLElement | null) => void;
}

export function StageEditor({ index, disabled, checklistReadOnly = false, registerErrorGroup }: StageEditorProperties) {
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
      <FieldSet>
        <FieldLegend className="flex items-center gap-2">
          <CalendarDaysIcon aria-hidden="true" className="size-4 text-primary-text" />
          Сроки и ответственный
        </FieldLegend>
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
      </FieldSet>
      <Separator />
      <FieldSet>
        <FieldLegend className="flex items-center gap-2">
          <WalletIcon aria-hidden="true" className="size-4 text-primary-text" />
          Плановый бюджет
        </FieldLegend>
        <FieldGroup className="grid min-w-0 gap-4 md:grid-cols-2">
          <ProjectMoneyField name={`stages.${index}.plannedWorkAmount`} label="План работ, ₽" disabled={disabled} />
          <ProjectMoneyField
            name={`stages.${index}.plannedMaterialAmount`}
            label="План материалов, ₽"
            disabled={disabled}
          />
        </FieldGroup>
      </FieldSet>
      <Separator />
      <FieldSet
        ref={registerErrorGroup}
        tabIndex={-1}
        aria-invalid={Boolean(checklistError?.message)}
        aria-describedby={checklistError?.message ? `checklist-${index}-error` : undefined}
      >
        <FieldLegend className="flex items-center gap-2">
          <ClipboardListIcon aria-hidden="true" className="size-4 text-primary-text" />
          Чек-лист
        </FieldLegend>
        <FieldDescription>
          {checklistReadOnly
            ? 'Этап фактически начат. Состав чек-листа доступен только для чтения.'
            : 'Изменения действуют только для этого объекта. В этапе должен остаться хотя бы один пункт.'}
        </FieldDescription>
        {checklistError?.message && <FieldError id={`checklist-${index}-error`}>{checklistError.message}</FieldError>}
        <FieldGroup>
          {checklist.fields.map((item, itemIndex) => (
            <FieldSet key={item.id} className="min-w-0 rounded-(--radius-card) border p-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary">Пункт {itemIndex + 1}</Badge>
                <div className="flex gap-1">
                  {!checklistReadOnly && (
                    <>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={disabled || itemIndex === 0}
                        aria-label={`Поднять пункт ${itemIndex + 1}`}
                        onClick={() => checklist.move(itemIndex, itemIndex - 1)}
                      >
                        <ArrowUpIcon />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={disabled || itemIndex === checklist.fields.length - 1}
                        aria-label={`Опустить пункт ${itemIndex + 1}`}
                        onClick={() => checklist.move(itemIndex, itemIndex + 1)}
                      >
                        <ArrowDownIcon />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={disabled}
                        aria-label={`Удалить пункт ${itemIndex + 1}`}
                        onClick={() => checklist.remove(itemIndex)}
                      >
                        <Trash2Icon />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <FieldGroup className="grid min-w-0 gap-4 md:grid-cols-2">
                <ProjectField
                  name={`stages.${index}.checklistItems.${itemIndex}.title`}
                  label="Название пункта"
                  required
                  maxLength={500}
                  disabled={disabled || checklistReadOnly}
                />
                <ProjectField
                  name={`stages.${index}.checklistItems.${itemIndex}.photoHint`}
                  label="Подсказка к фотографии"
                  maxLength={1000}
                  disabled={disabled || checklistReadOnly}
                />
              </FieldGroup>
            </FieldSet>
          ))}
        </FieldGroup>
        {!checklistReadOnly && (
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
        )}
      </FieldSet>
    </FieldGroup>
  );
}
