import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import { parseAmount } from '@entities/project';

import { updateMaterialInvoice } from '@api/clients/updateMaterialInvoice';
import type { Stage, StageMaterialInvoice } from '@api/types';

import { invoicePaymentValues, isInvoicePaymentUnchanged } from './invoice-payment-values';
import { paymentFormSchema } from './material-form';
import { useInvoiceCache } from './use-invoice-cache';
import { useMaterialAction } from './use-material-action';

export function useInvoicePayment(stage: Stage, invoice: StageMaterialInvoice, onSaved?: () => void) {
  const action = useMaterialAction(stage);
  const cache = useInvoiceCache(invoice);
  const form = useForm({
    values: invoicePaymentValues(invoice),
    resetOptions: { keepDirtyValues: true },
    resolver: zodResolver(paymentFormSchema),
  });
  const values = useWatch({ control: form.control });
  const { dirtyFields } = form.formState;
  const hasChanges =
    !invoice.paidAt || (Object.keys(dirtyFields).length > 0 && !isInvoicePaymentUnchanged(invoice, values));

  function saved(updated: StageMaterialInvoice) {
    cache.save(updated);
    form.reset(invoicePaymentValues(updated));
    onSaved?.();
  }

  function submit(values: { amount: string; date: string }) {
    const current = cache.current();
    if (isInvoicePaymentUnchanged(current, values)) {
      form.reset(invoicePaymentValues(current));
      onSaved?.();
      return;
    }
    return action.run(async () => {
      const updated = await updateMaterialInvoice({
        path: { invoiceId: invoice.id },
        body: {
          expectedVersion: current.version,
          isPaid: true,
          paidAmountMinor: parseAmount(values.amount) ?? 0n,
          paidDate: values.date,
        },
      }).unwrap();
      saved(updated);
    });
  }
  async function clear() {
    const current = cache.current();
    if (!current.paidAt) return;
    await action.run(async () => {
      const updated = await updateMaterialInvoice({
        path: { invoiceId: invoice.id },
        body: {
          expectedVersion: current.version,
          isPaid: false,
        },
      }).unwrap();
      saved(updated);
    });
  }
  return { form, action, submit, clear, hasChanges };
}
