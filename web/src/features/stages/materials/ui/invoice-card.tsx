import { useState } from 'react';

import { FileTextIcon, PencilIcon, Trash2Icon } from 'lucide-react';

import { formatDate, formatMoney } from '@entities/project';
import { Button } from '@shared/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

import type { Stage, StageMaterialInvoice } from '@api/types';

import { InvoiceDelivery } from './invoice-delivery';
import { InvoiceEditor } from './invoice-editor';
import { InvoiceFile } from './invoice-file';
import { InvoicePayment } from './invoice-payment';
import { InvoiceShortages } from './invoice-shortages';

interface InvoiceCardProperties {
  stage: Stage;
  invoice: StageMaterialInvoice;
  number: number;
  canReceive: boolean;
  canManage: boolean;
}

export function InvoiceCard({ stage, invoice, number, canReceive, canManage }: InvoiceCardProperties) {
  const [editing, setEditing] = useState<'edit' | 'delete' | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileTextIcon className="size-4" aria-hidden="true" />
            <h3 className="text-sm">Счёт №{number}</h3>
          </div>
          <p className="wrap-anywhere mt-2 font-bold text-2xl tabular-nums">{formatMoney(invoice.amountMinor)}</p>
        </CardTitle>
        <CardDescription className="wrap-anywhere">
          {invoice.supplierName ?? 'Поставщик не указан'} · Добавлен {formatDate(invoice.createdAt.slice(0, 10))}
        </CardDescription>
        <CardAction>
          <InvoiceFile fileId={invoice.fileId} />
          {canManage && (
            <>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Изменить счёт"
                title="Изменить счёт"
                onClick={() => setEditing('edit')}
              >
                <PencilIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                aria-label="Удалить счёт"
                title="Удалить счёт"
                onClick={() => setEditing('delete')}
              >
                <Trash2Icon />
              </Button>
            </>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <InvoicePayment stage={stage} invoice={invoice} canManage={canManage} />
          <InvoiceDelivery stage={stage} invoice={invoice} canReceive={canReceive} />
        </div>
        <InvoiceShortages stage={stage} invoice={invoice} canReceive={canReceive} canManage={canManage} />
      </CardContent>
      {canManage && editing && (
        <InvoiceEditor stage={stage} invoice={invoice} kind={editing} onClose={() => setEditing(null)} />
      )}
    </Card>
  );
}
