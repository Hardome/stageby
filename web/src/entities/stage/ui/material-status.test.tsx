import { renderToStaticMarkup } from 'react-dom/server';

import type { MaterialIndicator } from '@api/types';

import { MaterialStatus } from './material-status';

it.each([
  [0, 1, 'caution', 'success'],
  [1, 0, 'success', 'caution'],
  [1, 1, 'success', 'success'],
] as const)(
  'colors payment and delivery independently: %s paid, %s delivered',
  (paid, delivered, payment, delivery) => {
    const summary: MaterialIndicator = {
      color: paid && delivered ? 'green' : 'yellow',
      invoiceCount: 1,
      paidInvoiceCount: paid,
      deliveredInvoiceCount: delivered,
      openShortageCount: 0,
      isPartiallyPaid: false,
      isPartiallyDelivered: false,
    };
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(<MaterialStatus summary={summary} />);
    const badges = container.querySelectorAll('[data-slot="badge"]');

    expect(badges[0]).toHaveAttribute('data-variant', payment);
    expect(badges[1]).toHaveAttribute('data-variant', delivery);
  },
);
