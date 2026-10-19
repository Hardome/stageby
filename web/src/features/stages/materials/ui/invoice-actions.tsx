import { useState } from 'react';

import { AlertTriangleIcon, PencilIcon, Trash2Icon, TruckIcon, WalletIcon } from 'lucide-react';

import { DropdownMenuItem } from '@shared/ui/dropdown-menu';

import type { Stage, StageMaterialInvoice } from '@api/types';

import { useInvoiceDelivery } from '../lib/use-invoice-delivery';
import { InvoiceActionDialog } from './invoice-action-dialog';
import { InvoiceFileMenu } from './invoice-file-menu';
import { MaterialFeedback } from './material-feedback';

interface InvoiceActionsProperties {
  stage: Stage;
  invoice: StageMaterialInvoice;
  canManage: boolean;
}

type InvoiceDialog = 'edit' | 'delete' | 'payment' | 'shortage' | 'delivery-check';

export function InvoiceActions({ stage, invoice, canManage }: InvoiceActionsProperties) {
  const [dialog, setDialog] = useState<InvoiceDialog | null>(null);
  const delivery = useInvoiceDelivery(stage, invoice, () => setDialog('delivery-check'));
  const close = () => setDialog(null);

  return (
    <div className="col-start-2 row-span-2 row-start-1 flex max-w-full flex-col items-end gap-2 self-start">
      <InvoiceFileMenu fileId={invoice.fileId}>
        {canManage && (
          <DropdownMenuItem onClick={() => setDialog('payment')}>
            <WalletIcon />
            {invoice.paidAt ? 'Изменить оплату' : 'Внести оплату'}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled={delivery.action.blocked} onClick={() => void delivery.toggle()}>
          <TruckIcon />
          {invoice.deliveredAt ? 'Снять отметку доставки' : 'Подтвердить доставку'}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={delivery.action.blocked} onClick={() => setDialog('shortage')}>
          <AlertTriangleIcon />
          Сообщить о нехватке
        </DropdownMenuItem>
        {canManage && (
          <>
            <DropdownMenuItem onClick={() => setDialog('edit')}>
              <PencilIcon />
              Изменить счёт
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDialog('delete')}>
              <Trash2Icon />
              Удалить счёт
            </DropdownMenuItem>
          </>
        )}
      </InvoiceFileMenu>
      <MaterialFeedback action={delivery.action} />
      {dialog && <InvoiceActionDialog stage={stage} invoice={invoice} kind={dialog} onClose={close} />}
    </div>
  );
}
