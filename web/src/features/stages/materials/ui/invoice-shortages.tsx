import { useState } from 'react';

import { AlertTriangleIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';
import { DialogTrigger } from '@shared/ui/dialog';

import type { Stage, StageMaterialInvoice } from '@api/types';

import { useInvoiceShortages } from '../lib/use-invoice-shortages';
import { InvoiceShortageForm } from './invoice-shortage-form';
import { InvoiceShortageItem } from './invoice-shortage-item';
import { MaterialDialog } from './material-dialog';
import { MaterialFeedback } from './material-feedback';

export function InvoiceShortages({
  stage,
  invoice,
  canReceive,
  canManage,
}: {
  stage: Stage;
  invoice: StageMaterialInvoice;
  canReceive: boolean;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const editor = useInvoiceShortages(stage, invoice, () => setOpen(false));
  const active = invoice.shortages.filter((shortage) => !shortage.resolvedAt);
  const resolved = invoice.shortages.filter((shortage) => shortage.resolvedAt);
  const supplier = invoice.supplierName ? ` от ${invoice.supplierName}` : '';

  return (
    <section className="flex flex-col gap-3" aria-label="Нехватки по счёту">
      {active.map((shortage) => (
        <InvoiceShortageItem
          key={shortage.id}
          shortage={shortage}
          canResolve={canManage && !editor.action.blocked}
          onResolve={() => void editor.resolve(shortage)}
        />
      ))}
      {!open && <MaterialFeedback action={editor.action} />}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <p className="text-muted-foreground text-xs">
          {active.length > 0 ? `Открытых нехваток: ${active.length}` : 'Открытых нехваток нет'}
        </p>
        {canReceive && (
          <MaterialDialog
            isOpen={open}
            onOpenChange={setOpen}
            pending={editor.action.pending}
            title="Сообщить о нехватке"
            description={`Опишите нехватку по счёту${supplier}. Руководитель увидит сообщение.`}
            trigger={
              <DialogTrigger render={<Button variant="ghost" size="sm" disabled={editor.action.pending} />}>
                <AlertTriangleIcon data-icon="inline-start" />
                Сообщить о нехватке
              </DialogTrigger>
            }
          >
            <InvoiceShortageForm editor={editor} onClose={() => setOpen(false)} />
          </MaterialDialog>
        )}
      </div>
      {resolved.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer rounded-md py-2 text-muted-foreground outline-none focus-visible:ring-2">
            Устранённые нехватки · {resolved.length}
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {resolved.map((shortage) => (
              <InvoiceShortageItem key={shortage.id} shortage={shortage} canResolve={false} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
