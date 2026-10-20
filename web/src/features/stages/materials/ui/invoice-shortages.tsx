import { useState } from 'react';

import { AlertTriangleIcon } from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@shared/ui/accordion';
import { Button } from '@shared/ui/button';
import { DialogTrigger } from '@shared/ui/dialog';

import type { Stage, StageMaterialInvoice } from '@api/types';

import { useInvoiceShortages } from '../lib/use-invoice-shortages';
import { InvoiceShortageForm } from './invoice-shortage-form';
import { InvoiceShortageItem } from './invoice-shortage-item';
import { MaterialDialog } from './material-dialog';
import { MaterialFeedback } from './material-feedback';

interface InvoiceShortagesProperties {
  stage: Stage;
  invoice: StageMaterialInvoice;
  canReceive: boolean;
  canManage: boolean;
}

export function InvoiceShortages({ stage, invoice, canReceive, canManage }: InvoiceShortagesProperties) {
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
      {canReceive && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
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
        </div>
      )}
      {resolved.length > 0 && (
        <Accordion>
          <AccordionItem value="resolved-shortages">
            <AccordionTrigger className="flex-none items-center gap-2 text-muted-foreground">
              Устранённые нехватки · {resolved.length}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              {resolved.map((shortage) => (
                <InvoiceShortageItem key={shortage.id} shortage={shortage} canResolve={false} />
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </section>
  );
}
