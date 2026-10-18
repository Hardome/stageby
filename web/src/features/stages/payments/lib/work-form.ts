import { z } from 'zod';

import { parseAmount, todayInYekaterinburg } from '@entities/project';

import { createWorkPaymentSchema as paymentSchema } from '@api/zod/createWorkPaymentSchema';

import type { WorkAction } from '../model/types';

export function workFormSchema(action: WorkAction) {
  return z.object({
    amount:
      action.kind === 'payment'
        ? z.string().superRefine((value, context) => {
            try {
              const parsed = parseAmount(value);
              if (parsed === null || parsed === 0n)
                context.addIssue({ code: 'custom', message: 'Введите положительную сумму.' });
            } catch (error) {
              context.addIssue({
                code: 'custom',
                message: error instanceof Error ? error.message : 'Некорректная сумма.',
              });
            }
          })
        : z.string(),
    date: action.kind === 'payment' ? paymentSchema.shape.paidAt : z.string(),
    comment: z.union([z.literal(''), paymentSchema.shape.comment.unwrap().unwrap()]),
  });
}

export type WorkFormValues = z.infer<ReturnType<typeof workFormSchema>>;

export function workFormDefaults(action: WorkAction): WorkFormValues {
  const payment = action.payment;

  return {
    amount: payment ? String(payment.amountMinor / 100n) : '',
    date: payment?.paidAt ?? todayInYekaterinburg(),
    comment: payment?.comment ?? '',
  };
}
