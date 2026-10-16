import { useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { parseAmount } from '@entities/project';
import { type FileTransfer, uploadFile, useFileUploader } from '@shared/lib/file-upload';
import { errorStatus, useAccessError } from '@shared/lib/hooks';

import { createStageMaterialInvoice } from '@api/clients/createStageMaterialInvoice';
import type { CreateMaterialInvoice, Stage } from '@api/types';
import { createMaterialInvoiceSchema as invoiceSchema } from '@api/zod/createMaterialInvoiceSchema';

import { invoiceFileError, invoiceFormSchema, invoiceMime } from './material-form';
import { useMaterialAction } from './use-material-action';

export function useInvoiceCreate(stage: Stage, onSaved?: () => void) {
  const accessError = useAccessError();
  const action = useMaterialAction(stage);
  const request = useRef<CreateMaterialInvoice | null>(null);
  const [locked, setLocked] = useState(false);
  const form = useForm({ defaultValues: { amount: '', supplier: '' }, resolver: zodResolver(invoiceFormSchema) });
  const upload = useFileUploader<FileTransfer>({
    createItem: (file) => ({ id: crypto.randomUUID(), key: crypto.randomUUID(), file, status: 'uploading' }),
    validateFile: invoiceFileError,
    upload: (item, update) => uploadFile(item, update, 'material_invoice', invoiceMime(item.file)),
    onError: accessError,
    errorMessage: (error) => (error instanceof Error ? error.message : 'Не удалось загрузить файл. Повторите попытку.'),
  });

  async function submit(values: { amount: string; supplier: string }) {
    const fileId = upload.items[0]?.fileId;
    if (!fileId) return;
    request.current ??= invoiceSchema.parse({
      fileId,
      amountMinor: parseAmount(values.amount),
      supplierName: values.supplier.trim() || null,
    });
    const body = request.current;
    setLocked(true);
    await action.run(
      () => createStageMaterialInvoice({ path: { stageId: stage.id }, body }).unwrap(),
      () => {
        request.current = null;
        setLocked(false);
        form.reset();
        for (const item of upload.items) upload.remove(item.id);
        onSaved?.();
      },
      (error) => {
        const status = errorStatus(error);
        if (status === undefined || status === 408 || status < 400 || status >= 500) return;
        request.current = null;
        setLocked(false);
      },
    );
  }

  return { form, upload, action, submit, locked };
}
