import { useState } from 'react';

import { ClipboardListIcon, PlusIcon } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@shared/ui/accordion';
import { Button } from '@shared/ui/button';
import { FieldDescription, FieldError, FieldGroup, FieldSet } from '@shared/ui/field';

import type { ProjectFormValues } from '../model/types';
import { StageChecklistItem } from './stage-checklist-item';

interface StageChecklistProperties {
  index: number;
  disabled: boolean;
  readOnly: boolean;
  registerErrorGroup: (element: HTMLElement | null) => void;
}

export function StageChecklist({ index, disabled, readOnly, registerErrorGroup }: Readonly<StageChecklistProperties>) {
  const { control, getFieldState, formState } = useFormContext<ProjectFormValues>();
  const checklist = useFieldArray({ control, name: `stages.${index}.checklistItems` });
  const fieldError = getFieldState(`stages.${index}.checklistItems`, formState).error;
  const error = fieldError?.root ?? fieldError;
  const hasError = Boolean(fieldError);
  const [isExpanded, setExpanded] = useState(hasError);
  const [previousError, setPreviousError] = useState(fieldError);

  if (fieldError !== previousError) {
    setPreviousError(fieldError);
    if (hasError) setExpanded(true);
  }

  return (
    <Accordion
      value={isExpanded ? [`checklist-${index}`] : []}
      onValueChange={(value) => setExpanded(value.length > 0)}
    >
      <AccordionItem value={`checklist-${index}`} className="border-b-0">
        <AccordionTrigger
          ref={registerErrorGroup}
          aria-invalid={hasError}
          aria-describedby={error?.message ? `checklist-${index}-error` : undefined}
          className="flex-none items-center gap-2 text-base text-foreground"
        >
          <ClipboardListIcon aria-hidden="true" className="size-4 text-primary-text" />
          <span className="group-aria-expanded/accordion-trigger:hidden">Развернуть чек-лист</span>
          <span className="hidden group-aria-expanded/accordion-trigger:inline">Свернуть чек-лист</span>
        </AccordionTrigger>
        <AccordionContent keepMounted className="flex flex-col gap-4">
          <FieldSet>
            <FieldDescription className="!mt-0">
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
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
