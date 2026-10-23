import { editStage } from '@tests/project-edit-fixture';

import { materialAccess } from './material-access';
import { invoiceFileError, invoiceFormSchema, paymentFormSchema, shortageFormSchema } from './material-form';

describe('material invoice validation and permissions', () => {
  it.each(['invoice.pdf', 'invoice.jpg', 'invoice.jpeg', 'INVOICE.JPG'])('accepts supported files: %s', (name) => {
    expect(invoiceFileError(new File(['contents'], name))).toBeUndefined();
  });
  it('rejects empty files, unsupported types, mismatched MIME and excess size', () => {
    expect(invoiceFileError(new File([], 'invoice.pdf'))).toBeDefined();
    expect(invoiceFileError(new File(['contents'], 'invoice.png', { type: 'image/png' }))).toBeDefined();
    expect(invoiceFileError(new File(['contents'], 'invoice.pdf', { type: 'image/jpeg' }))).toBeDefined();
    const file = new File(['contents'], 'invoice.pdf');
    Object.defineProperty(file, 'size', { value: 10_000_000, configurable: true });
    expect(invoiceFileError(file)).toBeUndefined();
    Object.defineProperty(file, 'size', { value: 10_000_001 });
    expect(invoiceFileError(file)).toBeDefined();
  });
  it.each(['', '0', '-1', '1.5', '999999999999999999999'])('rejects invalid positive amounts: %s', (amount) => {
    expect(invoiceFormSchema.safeParse({ amount, supplier: '' }).success).toBe(false);
    expect(paymentFormSchema.safeParse({ amount, date: '2026-10-16' }).success).toBe(false);
  });
  it('keeps invoiced and paid amounts independent and requires a valid calendar date', () => {
    expect(invoiceFormSchema.safeParse({ amount: '100 000', supplier: '' }).success).toBe(true);
    expect(paymentFormSchema.safeParse({ amount: '95 000', date: '2026-10-16' }).success).toBe(true);
    expect(paymentFormSchema.safeParse({ amount: '95 000', date: '2026-02-30' }).success).toBe(false);
  });
  it('requires a shortage comment up to 500 characters', () => {
    expect(shortageFormSchema.safeParse({ comment: '  ' }).success).toBe(false);
    expect(shortageFormSchema.safeParse({ comment: 'я'.repeat(501) }).success).toBe(false);
    expect(shortageFormSchema.parse({ comment: ' Не привезли крепёж ' })).toEqual({ comment: 'Не привезли крепёж' });
  });
  it('allows only the manager to manage payments and only assigned foremen to receive', () => {
    const { stage } = editStage();
    expect(materialAccess(stage, { id: 1, role: 'manager' })).toEqual({ canManage: true, canReceive: true });
    expect(materialAccess(stage, { id: 4, role: 'foreman' })).toEqual({ canManage: false, canReceive: true });
    expect(materialAccess(stage, { id: 5, role: 'foreman' })).toEqual({ canManage: false, canReceive: false });
    expect(materialAccess(stage)).toEqual({ canManage: false, canReceive: false });
    expect(materialAccess({ ...stage, projectIsArchived: true }, { id: 1, role: 'manager' }).canManage).toBe(false);
    expect(materialAccess({ ...stage, isIncluded: false }, { id: 4, role: 'foreman' }).canReceive).toBe(false);
  });
  it('allows delivery after the stage has started without changing the stage status', () => {
    const { stage } = editStage({ status: 'in_progress', actualStartDate: '2026-10-15' });
    expect(materialAccess(stage, { id: 4, role: 'foreman' }).canReceive).toBe(true);
    expect(stage.status).toBe('in_progress');
  });
});
