import { z } from 'zod';

import { parseAmount } from '@entities/project';

import { createMaterialInvoiceSchema as invoiceSchema } from '@api/zod/createMaterialInvoiceSchema';
import { createMaterialShortageSchema as shortageSchema } from '@api/zod/createMaterialShortageSchema';
import { updateMaterialInvoiceSchema } from '@api/zod/updateMaterialInvoiceSchema';

export const maxInvoiceSize = 10 * 1024 * 1024;

export function invoiceMime(file: File) {
  return /\.pdf$/i.test(file.name) ? 'application/pdf' : 'image/jpeg';
}

export function invoiceFileError(file: File): string | undefined {
  if (!/\.(pdf|jpe?g)$/i.test(file.name) || (file.type && file.type !== invoiceMime(file)))
    return 'Выберите PDF или JPEG.';
  if (file.size === 0) return 'Файл пустой.';
  if (file.size > maxInvoiceSize) return 'Размер файла не должен превышать 10 МиБ.';
  if (file.name.length > 255) return 'Имя файла не должно превышать 255 символов.';
}

const amount = z.string().superRefine((value, context) => {
  try {
    const parsed = parseAmount(value);
    if (parsed === null || parsed <= 0n) throw new Error('Введите положительную сумму.');
  } catch (error) {
    context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Некорректная сумма.' });
  }
});

export const invoiceFormSchema = z.object({
  amount,
  supplier: z.union([z.literal(''), invoiceSchema.shape.supplierName.unwrap().unwrap()]),
});
export const paymentFormSchema = z.object({ amount, date: updateMaterialInvoiceSchema.shape.paidDate.unwrap() });
export const shortageFormSchema = z.object({
  comment: shortageSchema.shape.comment.trim().min(1, 'Опишите нехватку.'),
});
