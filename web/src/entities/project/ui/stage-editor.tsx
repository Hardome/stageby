import { CalendarDaysIcon, WalletIcon } from 'lucide-react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { AssigneePicker } from '@entities/user/@x/project';
import { FieldGroup, FieldLegend, FieldSet } from '@shared/ui/field';
import { Separator } from '@shared/ui/separator';

import type { ProjectFormValues } from '../model/types';
import { ProjectDateField } from './project-date-field';
import { ProjectMoneyField } from './project-money-field';
import { StageChecklist } from './stage-checklist';

interface StageEditorProperties {
  index: number;
  disabled: boolean;
  checklistReadOnly?: boolean;
  registerErrorGroup: (element: HTMLElement | null) => void;
}

export function StageEditor({ index, disabled, checklistReadOnly = false, registerErrorGroup }: StageEditorProperties) {
  const { control, setValue } = useFormContext<ProjectFormValues>();
  const [start, end, assigneeName] = useWatch({
    control,
    name: ['plannedStartDate', 'plannedEndDate', `stages.${index}.assigneeName`],
    exact: true,
  });

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
      <StageChecklist
        index={index}
        disabled={disabled}
        readOnly={checklistReadOnly}
        registerErrorGroup={registerErrorGroup}
      />
    </FieldGroup>
  );
}
