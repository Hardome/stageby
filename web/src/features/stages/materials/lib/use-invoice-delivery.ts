import { updateMaterialInvoice } from '@api/clients/updateMaterialInvoice';
import type { Stage, StageMaterialInvoice } from '@api/types';

import { useInvoiceCache } from './use-invoice-cache';
import { useMaterialAction } from './use-material-action';

export function useInvoiceDelivery(stage: Stage, invoice: StageMaterialInvoice, onDelivered?: () => void) {
  const action = useMaterialAction(stage);
  const cache = useInvoiceCache(invoice);

  async function toggle() {
    const isDelivered = !invoice.deliveredAt;
    const current = cache.current();
    if (Boolean(current.deliveredAt) === isDelivered) return;
    await action.run(
      async () => {
        const updated = await updateMaterialInvoice({
          path: { invoiceId: invoice.id },
          body: { expectedVersion: current.version, isDelivered },
        }).unwrap();
        cache.save(updated);
      },
      isDelivered ? onDelivered : undefined,
    );
  }

  return { action, toggle };
}
