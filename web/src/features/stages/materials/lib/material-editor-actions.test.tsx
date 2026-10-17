import { act } from 'react';

import { invoice, mocks, probe, setupTest } from './material-actions-test-setup';

describe('material invoice editor', () => {
  setupTest();

  it('keeps the selected file and input through a version conflict until explicit reload', async () => {
    await act(async () => {
      probe.editor.form.setValue('amount', '120000');
      probe.editor.form.setValue('supplier', 'Новый поставщик');
      probe.editor.upload.select([new File(['%PDF-1.7'], 'replacement.pdf')]);
      await Promise.resolve();
    });
    mocks.update.mockRejectedValueOnce({
      status: 409,
      data: { error: 'Conflict', code: 'version_conflict', message: 'Конфликт версии' },
    });
    await act(async () => {
      await probe.editor.submit(probe.editor.form.getValues());
    });
    expect(probe.editor.action.needsReload).toBe(true);
    await act(async () => {
      await probe.editor.submit(probe.editor.form.getValues());
    });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    await act(async () => {
      await probe.editor.action.reload();
    });
    expect(probe.editor.form.getValues()).toEqual({ amount: '120000', supplier: 'Новый поставщик' });
    expect(probe.editor.upload.items[0]?.fileId).toBe(41);
    mocks.update.mockResolvedValue({ ...invoice, version: 6 });
    await act(async () => {
      await probe.editor.submit(probe.editor.form.getValues());
    });
    expect(mocks.update).toHaveBeenLastCalledWith({
      path: { invoiceId: 401 },
      body: { expectedVersion: 5, amountMinor: 12_000_000n, supplierName: 'Новый поставщик', fileId: 41 },
    });
    expect(mocks.saved).toHaveBeenCalledTimes(1);
  });

  it('clears supplier without replacing the file and invalidates derived data', async () => {
    mocks.update.mockResolvedValue({ ...invoice, version: 3 });
    await act(async () => {
      await probe.editor.submit({ amount: '100000', supplier: '  ' });
    });
    expect(mocks.update).toHaveBeenCalledWith({
      path: { invoiceId: 401 },
      body: { expectedVersion: 2, amountMinor: 10_000_000n, supplierName: null },
    });
    expect(mocks.invalidate).toHaveBeenCalled();
  });

  it('blocks deletion when reload shows that the invoice was deleted', async () => {
    mocks.remove.mockRejectedValueOnce({
      status: 409,
      data: { error: 'Conflict', code: 'version_conflict', message: 'Конфликт версии' },
    });
    await act(async () => {
      await probe.editor.remove();
    });
    mocks.list.mockResolvedValue([]);
    await act(async () => {
      await probe.editor.action.reload();
    });
    expect(probe.editor.action.blocked).toBe(true);
    expect(probe.editor.action.message).toContain('Счёт уже удалён');
    await act(async () => {
      await probe.editor.remove();
    });
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(mocks.saved).not.toHaveBeenCalled();
  });

  it('prevents concurrent deletion requests and closes only after success', async () => {
    const request = Promise.withResolvers<void>();
    mocks.remove.mockReturnValue(request.promise);
    let pending: Promise<void> | undefined;
    await act(async () => {
      pending = probe.editor.remove();
      await Promise.resolve();
    });
    await act(async () => {
      await probe.editor.remove();
    });
    expect(mocks.remove).toHaveBeenCalledTimes(1);
    expect(mocks.saved).not.toHaveBeenCalled();
    await act(async () => {
      request.resolve();
      await pending;
    });
    expect(mocks.remove).toHaveBeenCalledWith({ path: { invoiceId: 401 }, body: { expectedVersion: 2 } });
    expect(mocks.saved).toHaveBeenCalledTimes(1);
    expect(mocks.invalidate).toHaveBeenCalled();
  });
});
