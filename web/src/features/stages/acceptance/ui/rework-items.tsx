import { useRef } from 'react';

import { Controller, type UseFormReturn, useFieldArray } from 'react-hook-form';

import { Checkbox } from '@shared/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@shared/ui/field';
import { Textarea } from '@shared/ui/textarea';

import type { ChecklistItem } from '@api/types';

import type { ReworkFormValues } from '../model/types';

interface ReworkItemsProperties {
  form: UseFormReturn<ReworkFormValues>;
  items: ChecklistItem[];
}

export function ReworkItems({ form, items }: Readonly<ReworkItemsProperties>) {
  const drafts = useRef(new Map<number, string>());
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const errors = form.formState.errors.items;
  const error = errors?.message ?? errors?.root?.message;

  return (
    <FieldSet>
      <FieldLegend>Пункты для доработки</FieldLegend>
      <FieldGroup>
        {items
          .toSorted((left, right) => left.position - right.position)
          .map((item) => {
            const index = fields.findIndex((entry) => entry.itemId === item.id);
            const isSelected = index !== -1;
            const commentError = isSelected ? errors?.[index]?.comment?.message : undefined;

            return (
              <FieldSet key={item.id} className="min-w-0">
                <Field orientation="horizontal" data-invalid={Boolean(error)}>
                  <Checkbox
                    id={`rework-item-${item.id}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        append({ itemId: item.id, comment: drafts.current.get(item.id) ?? '' }, { shouldFocus: false });
                      } else {
                        drafts.current.set(item.id, form.getValues(`items.${index}.comment`));
                        remove(index);
                      }
                    }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'rework-items-error' : undefined}
                  />
                  <FieldLabel htmlFor={`rework-item-${item.id}`} className="min-w-0 wrap-anywhere">
                    {item.title}
                  </FieldLabel>
                </Field>
                {isSelected && (
                  <Field data-invalid={Boolean(commentError)}>
                    <FieldLabel htmlFor={`rework-comment-${item.id}`}>Замечание к пункту «{item.title}»</FieldLabel>
                    <Controller
                      key={fields[index]?.id}
                      control={form.control}
                      name={`items.${index}.comment`}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          id={`rework-comment-${item.id}`}
                          required
                          maxLength={5000}
                          aria-invalid={Boolean(commentError)}
                          aria-describedby={commentError ? `rework-comment-${item.id}-error` : undefined}
                        />
                      )}
                    />
                    {commentError && <FieldError id={`rework-comment-${item.id}-error`}>{commentError}</FieldError>}
                  </Field>
                )}
              </FieldSet>
            );
          })}
      </FieldGroup>
      {error && <FieldError id="rework-items-error">{error}</FieldError>}
    </FieldSet>
  );
}
