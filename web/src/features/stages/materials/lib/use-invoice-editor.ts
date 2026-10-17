import { useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { parseAmount } from '@entities/project';
import { type FileTransfer, uploadFile, useFileUploader } from '@shared/lib/file-upload';
import { useAccessError } from '@shared/lib/hooks';

import { deleteMaterialInvoice } from '@api/clients/deleteMaterialInvoice';
import { updateMaterialInvoice } from '@api/clients/updateMaterialInvoice';
import type { Stage, StageMaterialInvoice } from '@api/types';

import { invoiceFileError, invoiceFormSchema, invoiceMime } from './material-form';
import { useInvoiceCache } from './use-invoice-cache';
import { useMaterialAction } from './use-material-action';

export function useInvoiceEditor(stage: Stage, invoice: StageMaterialInvoice, onSaved: () => void) {
  const version = useRef(invoice.version);
  const action = useMaterialAction(stage, invoice.id);
  const cache = useInvoiceCache(invoice);
  const accessError = useAccessError();
  const form = useForm({
    defaultValues: { amount: String(invoice.amountMinor / 100n), supplier: invoice.supplierName ?? '' },
    resolver: zodResolver(invoiceFormSchema),
  });
  const upload = useFileUploader<FileTransfer>({
    createItem: (file) => ({ id: crypto.randomUUID(), key: crypto.randomUUID(), file, status: 'uploading' }),
    validateFile: invoiceFileError,
    upload: (item, update) => uploadFile(item, update, 'material_invoice', invoiceMime(item.file)),
    onError: accessError,
    errorMessage: (error) => (error instanceof Error ? error.message : 'Не удалось загрузить файл.'),
  });

  async function reload() {
    const invoices = await action.reload();
    const current = invoices?.find((entry) => entry.id === invoice.id);
    if (current) version.current = current.version;
    return invoices;
  }

  function submit(values: { amount: string; supplier: string }) {
    if (upload.items.some((item) => item.status !== 'uploaded')) return;
    return action.run(async () => {
      const updated = await updateMaterialInvoice({
        path: { invoiceId: invoice.id },
        body: {
          expectedVersion: version.current,
          amountMinor: parseAmount(values.amount) ?? 0n,
          supplierName: values.supplier.trim() || null,
          ...(upload.items[0]?.fileId !== undefined && { fileId: upload.items[0].fileId }),
        },
      }).unwrap();
      cache.save(updated);
    }, onSaved);
  }

  function remove() {
    return action.run(
      () =>
        deleteMaterialInvoice({
          path: { invoiceId: invoice.id },
          body: { expectedVersion: version.current },
        }).unwrap(),
      onSaved,
    );
  }

  return { form, upload, action: { ...action, reload }, submit, remove };
}
