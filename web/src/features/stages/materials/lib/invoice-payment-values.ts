import { parseAmount } from '@entities/project';

import type { StageMaterialInvoice } from '@api/types';

export function invoicePaymentValues(invoice: StageMaterialInvoice) {
  return {
    amount: invoice.paidAmountMinor === null ? '' : String(invoice.paidAmountMinor / 100n),
    date: invoice.paidDate ?? '',
  };
}

export function isInvoicePaymentUnchanged(invoice: StageMaterialInvoice, values: { amount?: string; date?: string }) {
  if (!invoice.paidAt) return false;
  try {
    return parseAmount(values.amount ?? '') === invoice.paidAmountMinor && (values.date ?? null) === invoice.paidDate;
  } catch {
    return false;
  }
}
