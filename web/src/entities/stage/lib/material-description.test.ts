import type { MaterialIndicator } from '@api/types';

import { materialDescriptions } from './material-description';

describe('material summary labels', () => {
  it('keeps partial payment and delivery visible alongside a shortage', () => {
    const summary: MaterialIndicator = {
      color: 'red',
      invoiceCount: 3,
      paidInvoiceCount: 1,
      deliveredInvoiceCount: 2,
      openShortageCount: 1,
      isPartiallyPaid: true,
      isPartiallyDelivered: true,
    };
    expect(materialDescriptions(summary)).toEqual(['Есть нехватка', 'Оплачено частично', 'Доставлено частично']);
  });
});
