import type { Stage, StageMaterialInvoice } from '@api/types';

import { InvoiceActions } from './invoice-actions';
import { InvoiceCard } from './invoice-card';
import { InvoiceFileMenu } from './invoice-file-menu';
import { InvoiceList } from './invoice-list';
import { InvoiceShortages } from './invoice-shortages';

interface ForemanInvoiceListProperties {
  stage: Stage;
  invoices: StageMaterialInvoice[];
  canReceive: boolean;
}

export function ForemanInvoiceList({ stage, invoices, canReceive }: ForemanInvoiceListProperties) {
  return (
    <InvoiceList
      count={invoices.length}
      emptyDescription="Счета появятся после добавления руководителем. Здесь можно отметить доставку и нехватку."
    >
      {invoices.map((invoice, index) => (
        <InvoiceCard
          key={invoice.id}
          invoice={invoice}
          number={index + 1}
          actions={
            canReceive ? (
              <InvoiceActions stage={stage} invoice={invoice} canManage={false} />
            ) : (
              <InvoiceFileMenu fileId={invoice.fileId} />
            )
          }
        >
          {invoice.shortages.length > 0 && (
            <InvoiceShortages stage={stage} invoice={invoice} canReceive={false} canManage={false} />
          )}
        </InvoiceCard>
      ))}
    </InvoiceList>
  );
}
