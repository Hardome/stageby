import type { MaterialIndicator } from '@api/types';

export function materialDescriptions(summary: MaterialIndicator): string[] {
  if (summary.openShortageCount > 0) return ['Есть нехватка'];
  if (summary.invoiceCount === 0) return ['Требуется загрузить счёт'];
  let payment = summary.paidInvoiceCount === summary.invoiceCount ? 'Счета оплачены' : 'Требуется оплата';
  if (summary.isPartiallyPaid) payment = 'Оплачено частично';
  let delivery = summary.deliveredInvoiceCount === summary.invoiceCount ? 'Материалы доставлены' : 'Ожидается доставка';
  if (summary.isPartiallyDelivered) delivery = 'Доставлено частично';
  return [payment, delivery];
}
