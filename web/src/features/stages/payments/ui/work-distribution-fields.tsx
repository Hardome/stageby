import { useFieldArray, useFormContext } from 'react-hook-form';

import { formatMoney, parseAmount } from '@entities/project';
import { Button } from '@shared/ui/button';
import { FieldError } from '@shared/ui/field';

import type { WorkPlanRow } from '@api/types';

import type { WorkFormValues } from '../lib/work-form';
import { WorkRowFields } from './work-row-fields';

interface WorkDistributionFieldsProperties {
  row: WorkPlanRow;
  disabled: boolean;
}

export function WorkDistributionFields({ row, disabled }: WorkDistributionFieldsProperties) {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<WorkFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'rows' });
  const rows = watch('rows');
  let total: bigint | null;

  try {
    total = rows.reduce((sum, item) => sum + (parseAmount(item.amount) ?? 0n), 0n);
  } catch {
    total = null;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Исходный план: {formatMoney(row.amountMinor)}. Распределено: {formatMoney(total)}.
      </p>
      {fields.map((field, index) => (
        <fieldset key={field.id} disabled={disabled} className="flex min-w-0 flex-col gap-4 rounded-xl border p-4">
          <legend className="px-2 font-semibold">Строка {index + 1}</legend>
          <WorkRowFields disabled={disabled} index={index} />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || fields.length <= 2}
            onClick={() => remove(index)}
          >
            Убрать строку
          </Button>
        </fieldset>
      ))}
      <FieldError>{errors.rows?.root?.message ?? errors.rows?.message}</FieldError>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => append({ amount: '', recipient: null, date: '' })}
      >
        Ещё строка
      </Button>
    </div>
  );
}
