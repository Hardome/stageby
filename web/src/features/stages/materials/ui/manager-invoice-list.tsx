import type { Stage, StageMaterialInvoice } from '@api/types';

import { InvoiceActions } from './invoice-actions';
import { InvoiceCard } from './invoice-card';
import { InvoiceCreate } from './invoice-create';
import { InvoiceList } from './invoice-list';
import { InvoiceShortages } from './invoice-shortages';

interface ManagerInvoiceListProperties {
  stage: Stage;
  invoices: StageMaterialInvoice[];
  canManage: boolean;
}

export function ManagerInvoiceList({ stage, invoices, canManage }: Readonly<ManagerInvoiceListProperties>) {
  return (
    <InvoiceList
      count={invoices.length}
      emptyDescription="Добавьте счёт с файлом и суммой, затем отметьте оплату и доставку."
      action={canManage && <InvoiceCreate stage={stage} count={invoices.length} />}
    >
      {invoices.map((invoice, index) => (
        <InvoiceCard
          key={invoice.id}
          invoice={invoice}
          number={index + 1}
          actions={canManage && <InvoiceActions stage={stage} invoice={invoice} canManage={true} />}
        >
          {invoice.shortages.length > 0 && (
            <InvoiceShortages stage={stage} invoice={invoice} canReceive={false} canManage={canManage} />
          )}
        </InvoiceCard>
      ))}
      {invoices.length >= 10 && canManage && (
        <li className="p-4 text-sm text-muted-foreground">На этапе может быть не больше 10 счетов. Лимит достигнут.</li>
      )}
    </InvoiceList>
  );
}
