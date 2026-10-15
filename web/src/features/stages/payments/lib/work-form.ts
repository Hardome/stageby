import { z } from 'zod';

import { parseAmount, todayInYekaterinburg } from '@entities/project';

import { createWorkPaymentSchema as paymentSchema } from '@api/zod/createWorkPaymentSchema';
import { createWorkPlanRowSchema as rowSchema } from '@api/zod/createWorkPlanRowSchema';

import type { WorkAction } from '../model/types';

const amount = (isPositive: boolean) =>
  z.string().superRefine((value, context) => {
    try {
      const parsed = parseAmount(value);
      if (parsed === null || (isPositive && parsed === 0n)) {
        context.addIssue({ code: 'custom', message: isPositive ? 'Введите положительную сумму.' : 'Введите сумму.' });
      }
    } catch (error) {
      context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Некорректная сумма.' });
    }
  });

const date = z.union([z.literal(''), rowSchema.shape.dueDate.unwrap().unwrap()]);
const row = z.object({
  amount: amount(false),
  recipient: z.object({ id: rowSchema.shape.recipientId.unwrap().unwrap(), label: z.string() }).nullable(),
  date,
});

export function workFormSchema(action: WorkAction) {
  return z
    .object({
      amount: action.kind === 'row' || action.kind === 'payment' ? amount(action.kind === 'payment') : z.string(),
      recipient: row.shape.recipient,
      date: action.kind === 'payment' ? paymentSchema.shape.paidAt : date,
      comment: z.union([z.literal(''), paymentSchema.shape.comment.unwrap().unwrap()]),
      rows: action.kind === 'distribute' ? z.array(row).min(2, 'Добавьте минимум две строки.') : z.array(row),
    })
    .superRefine((values, context) => {
      if (action.kind !== 'distribute') return;

      try {
        const total = values.rows.reduce((sum, item) => sum + (parseAmount(item.amount) ?? 0n), 0n);
        if (total !== action.row.amountMinor) {
          context.addIssue({
            code: 'custom',
            path: ['rows'],
            message: 'Сумма новых строк должна совпадать с исходной.',
          });
        }
      } catch {
        // Ошибки отдельных сумм выводятся у полей строк.
      }
    });
}

export type WorkFormValues = z.infer<ReturnType<typeof workFormSchema>>;

export function workFormDefaults(action: WorkAction): WorkFormValues {
  const payment = action.kind === 'payment' ? action.payment : undefined;
  const planRow = action.kind === 'row' ? action.row : undefined;

  return {
    amount: String((payment?.amountMinor ?? planRow?.amountMinor ?? 0n) / 100n),
    recipient: planRow?.recipientId ? { id: planRow.recipientId, label: `Получатель №${planRow.recipientId}` } : null,
    date: payment?.paidAt ?? planRow?.dueDate ?? (action.kind === 'payment' ? todayInYekaterinburg() : ''),
    comment: payment?.comment ?? '',
    rows:
      action.kind === 'distribute'
        ? [
            { amount: '', recipient: null, date: '' },
            { amount: '', recipient: null, date: '' },
          ]
        : [],
  };
}

export function rowRequest(values: Pick<WorkFormValues, 'amount' | 'recipient' | 'date'>) {
  return rowSchema.parse({
    amountMinor: parseAmount(values.amount),
    recipientId: values.recipient?.id ?? null,
    dueDate: values.date || null,
  });
}
