import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Checkbox } from '@shared/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@shared/ui/field';

import type { ChecklistItem } from '@api/types';

import type { ReworkFormValues } from '../model/types';

interface ReworkItemsProperties {
  form: UseFormReturn<ReworkFormValues>;
  items: ChecklistItem[];
}

export function ReworkItems({ form, items }: ReworkItemsProperties) {
  const error = form.formState.errors.itemIds?.message;

  return (
    <FieldSet>
      <FieldLegend>Пункты для доработки</FieldLegend>
      <Controller
        control={form.control}
        name="itemIds"
        render={({ field }) => (
          <FieldGroup>
            {items
              .toSorted((left, right) => left.position - right.position)
              .map((item) => (
                <Field key={item.id} orientation="horizontal" data-invalid={Boolean(error)}>
                  <Checkbox
                    id={`rework-item-${item.id}`}
                    checked={new Set(field.value).has(item.id)}
                    onCheckedChange={(checked) =>
                      field.onChange(checked ? [...field.value, item.id] : field.value.filter((id) => id !== item.id))
                    }
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? 'rework-items-error' : undefined}
                  />
                  <FieldLabel htmlFor={`rework-item-${item.id}`} className="wrap-anywhere min-w-0">
                    {item.title}
                  </FieldLabel>
                </Field>
              ))}
          </FieldGroup>
        )}
      />
      {error && <FieldError id="rework-items-error">{error}</FieldError>}
    </FieldSet>
  );
}
