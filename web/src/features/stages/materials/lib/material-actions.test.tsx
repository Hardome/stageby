// cspell:ignore unstub
import { act } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { todayInYekaterinburg } from '@entities/project';

import { invoice, mocks, Probe, probe, setupTest } from './material-actions-test-setup';

describe('material invoice actions', () => {
  const context = setupTest();

  it('retries the same invoice after a lost response and prevents duplicate clicks', async () => {
    await act(async () => {
      probe.create.upload.select([new File(['%PDF-1.7'], 'invoice.pdf')]);
      await Promise.resolve();
    });
    mocks.create.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(invoice);
    await act(async () => {
      await Promise.all([
        probe.create.submit({ amount: '100000', supplier: 'Поставщик' }),
        probe.create.submit({ amount: '100000', supplier: 'Поставщик' }),
      ]);
    });
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(probe.create.locked).toBe(true);
    await act(async () => {
      await probe.create.submit({ amount: '200000', supplier: 'Другой' });
    });
    expect(mocks.create.mock.calls[1]).toEqual(mocks.create.mock.calls[0]);
    expect(mocks.create.mock.calls[0]?.[0]).toEqual({
      path: { stageId: 11 },
      body: { fileId: 41, amountMinor: 10_000_000n, supplierName: 'Поставщик' },
    });
    expect(probe.create.locked).toBe(false);
    expect(probe.create.upload.items).toHaveLength(0);
    expect(mocks.invalidate).toHaveBeenCalled();
  });

  it('pays 95 000 against a 100 000 invoice and clears payment independently of delivery', async () => {
    expect(probe.payment.form.getValues()).toEqual({ amount: '', date: todayInYekaterinburg() });
    await act(async () => {
      await probe.payment.submit({ amount: '95000', date: '2026-10-16' });
    });
    expect(mocks.update).toHaveBeenLastCalledWith({
      path: { invoiceId: 401 },
      body: { expectedVersion: 2, isPaid: true, paidAmountMinor: 9_500_000n, paidDate: '2026-10-16' },
    });
    await act(async () => {
      await probe.payment.clear();
    });
    expect(mocks.update).toHaveBeenLastCalledWith({
      path: { invoiceId: 401 },
      body: { expectedVersion: 3, isPaid: false },
    });
    expect(probe.payment.form.getValues()).toEqual({ amount: '', date: todayInYekaterinburg() });
  });

  it('requires reload after a conflict, preserves input and accepts a fresh version', async () => {
    mocks.update.mockRejectedValueOnce({
      status: 409,
      data: { error: 'Conflict', code: 'version_conflict', message: 'Конфликт версии' },
    });
    await act(async () => {
      probe.payment.form.setValue('amount', '95000');
      await probe.payment.submit({ amount: '95000', date: '2026-10-16' });
    });
    expect(probe.payment.action.needsReload).toBe(true);
    await act(async () => {
      await probe.payment.submit({ amount: '95000', date: '2026-10-16' });
    });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    await act(async () => {
      await probe.payment.action.reload();
      context.root.render(
        <QueryClientProvider client={context.client}>
          <Probe version={5} />
        </QueryClientProvider>,
      );
    });
    expect(probe.payment.form.getValues('amount')).toBe('95000');
    await act(async () => {
      await probe.payment.submit({ amount: '95000', date: '2026-10-16' });
    });
    const lastCall = mocks.update.mock.lastCall?.[0] as { body: { expectedVersion: number } };
    expect(lastCall.body.expectedVersion).toBe(5);
  });

  it('refreshes the list on a concurrent invoice limit refusal and keeps the selected file', async () => {
    await act(async () => {
      probe.create.upload.select([new File(['%PDF-1.7'], 'invoice.pdf')]);
      await Promise.resolve();
    });
    mocks.create.mockRejectedValue({
      status: 409,
      data: { error: 'Conflict', code: 'invoice_limit_exceeded', message: 'Лимит счетов' },
    });
    await act(async () => {
      await probe.create.submit({ amount: '100000', supplier: '' });
    });
    expect(mocks.invalidate).toHaveBeenCalled();
    expect(probe.create.upload.items[0]?.fileId).toBe(41);
    expect(probe.create.action.message).toBe('Лимит счетов');
    expect(probe.create.locked).toBe(false);
  });

  it('creates and resolves shortages through separate operations', async () => {
    await act(async () => {
      await probe.shortage.submit({ comment: 'Не хватает крепежа' });
    });
    expect(mocks.shortage).toHaveBeenCalledWith({ path: { invoiceId: 401 }, body: { comment: 'Не хватает крепежа' } });
    expect(mocks.resolve).not.toHaveBeenCalled();
    await act(async () => {
      await probe.shortage.resolve({
        id: 501,
        invoiceId: 401,
        version: 3,
        comment: 'Не хватает',
        reportedAt: invoice.createdAt,
        reportedBy: { id: 4, fullName: 'Иван' },
        resolvedAt: null,
        resolvedBy: null,
        resolutionComment: null,
      });
    });
    expect(mocks.resolve).toHaveBeenCalledWith({ path: { shortageId: 501 }, body: { expectedVersion: 3 } });
  });
});
