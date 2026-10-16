import { TruckIcon } from 'lucide-react';

import { formatDate } from '@entities/project';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Spinner } from '@shared/ui/spinner';

import type { Stage, StageMaterialInvoice } from '@api/types';

import { useInvoiceDelivery } from '../lib/use-invoice-delivery';
import { MaterialFeedback } from './material-feedback';

export function InvoiceDelivery({
  stage,
  invoice,
  canReceive,
}: {
  stage: Stage;
  invoice: StageMaterialInvoice;
  canReceive: boolean;
}) {
  const { action, toggle } = useInvoiceDelivery(stage, invoice);
  const deliveredBy = invoice.deliveredBy ? ` · ${invoice.deliveredBy.fullName}` : '';
  const description = invoice.deliveredAt
    ? `${formatDate(invoice.deliveredAt.slice(0, 10))}${deliveredBy}`
    : 'Отметьте после получения материалов по этому счёту';

  return (
    <section className="flex h-full min-w-0 flex-col gap-3 rounded-xl bg-background p-4" aria-label="Доставка счёта">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 font-semibold text-sm">
          <TruckIcon className="size-4 text-muted-foreground" aria-hidden="true" />
          Доставка
        </h4>
        <Badge variant={invoice.deliveredAt ? 'success' : 'caution'}>
          {invoice.deliveredAt ? 'Доставлено' : 'Ожидается'}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <p className="font-bold text-xl">{invoice.deliveredAt ? 'Материалы получены' : 'Ожидает доставки'}</p>
        <p className="wrap-anywhere text-muted-foreground text-sm">{description}</p>
      </div>
      {canReceive && (
        <Button
          variant="outline"
          className="self-start"
          disabled={action.blocked}
          onClick={() => {
            void toggle();
          }}
        >
          {action.pending && <Spinner data-icon="inline-start" />}
          {invoice.deliveredAt ? 'Снять отметку доставки' : 'Подтвердить доставку'}
        </Button>
      )}
      <MaterialFeedback action={action} />
    </section>
  );
}
