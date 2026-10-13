import { ClipboardListIcon, PlusIcon } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import { Button } from '@shared/ui/button';
import { FieldDescription, FieldError, FieldGroup, FieldLegend, FieldSet } from '@shared/ui/field';

import type { ProjectFormValues } from '../model/types';
import { StageChecklistItem } from './stage-checklist-item';

interface StageChecklistProperties {
  index: number;
  disabled: boolean;
  readOnly: boolean;
  registerErrorGroup: (element: HTMLElement | null) => void;
}

export function StageChecklist({ index, disabled, readOnly, registerErrorGroup }: StageChecklistProperties) {
  const { control, getFieldState, formState } = useFormContext<ProjectFormValues>();
  const checklist = useFieldArray({ control, name: `stages.${index}.checklistItems` });
  const fieldError = getFieldState(`stages.${index}.checklistItems`, formState).error;
  const error = fieldError?.root ?? fieldError;

  return (
    <FieldSet
      ref={registerErrorGroup}
      tabIndex={-1}
      aria-invalid={Boolean(error?.message)}
      aria-describedby={error?.message ? `checklist-${index}-error` : undefined}
    >
      <FieldLegend className="flex items-center gap-2">
        <ClipboardListIcon aria-hidden="true" className="size-4 text-primary-text" />
        Чек-лист
      </FieldLegend>
      <FieldDescription>
        {readOnly
          ? 'Этап фактически начат. Состав чек-листа доступен только для чтения.'
          : 'Изменения действуют только для этого объекта. В этапе должен остаться хотя бы один пункт.'}
      </FieldDescription>
      {error?.message && <FieldError id={`checklist-${index}-error`}>{error.message}</FieldError>}
      <FieldGroup>
        {checklist.fields.map((item, itemIndex) => (
          <StageChecklistItem
            key={item.id}
            stageIndex={index}
            itemIndex={itemIndex}
            itemCount={checklist.fields.length}
            disabled={disabled}
            readOnly={readOnly}
            onMove={checklist.move}
            onRemove={checklist.remove}
          />
        ))}
      </FieldGroup>
      {!readOnly && (
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
  );
}
