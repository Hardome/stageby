import { useQueryClient } from '@tanstack/react-query';

import { listStageMaterialInvoicesQueryKey } from '@api/queries/useListStageMaterialInvoices';
import type { StageMaterialInvoice } from '@api/types';

export function useInvoiceCache(invoice: StageMaterialInvoice) {
  const client = useQueryClient();
  const queryKey = listStageMaterialInvoicesQueryKey({ path: { stageId: invoice.stageId } });

  function current() {
    return client.getQueryData<StageMaterialInvoice[]>(queryKey)?.find((entry) => entry.id === invoice.id) ?? invoice;
  }

  function save(updated: StageMaterialInvoice) {
    client.setQueryData<StageMaterialInvoice[]>(queryKey, (invoices) =>
      invoices?.map((entry) => (entry.id === updated.id ? updated : entry)),
    );
  }

  return { current, save };
}
