import type { StageMaterialInvoice } from '@api/types';

interface InvoicePaymentStatus {
  label: string;
  variant: 'secondary' | 'success' | 'caution';
}

export function invoicePaymentStatus(
  invoice: Pick<StageMaterialInvoice, 'paidAt' | 'paidAmountMinor' | 'amountMinor'>,
): InvoicePaymentStatus {
  if (!invoice.paidAt) return { label: 'Не оплачен', variant: 'secondary' };

  return (invoice.paidAmountMinor ?? 0n) >= invoice.amountMinor
    ? { label: 'Оплачен', variant: 'success' }
    : { label: 'Оплачен частично', variant: 'caution' };
}
