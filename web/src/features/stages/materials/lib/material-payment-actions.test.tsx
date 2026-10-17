// cspell:ignore unstub
import { act } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { listStageMaterialInvoicesQueryKey } from '@api/queries/useListStageMaterialInvoices';
import type { StageMaterialInvoice } from '@api/types';

import { invoice, mocks, Probe, probe, setupTest } from './material-actions-test-setup';

describe('material invoice actions', () => {
  const context = setupTest();

  it('skips unchanged payments using the latest query cache, including formatted amounts', async () => {
    const paidInvoice = {
      ...invoice,
      paidAmountMinor: 9_500_000n,
      paidDate: '2026-10-16',
      paidAt: invoice.createdAt,
      version: 7,
    };
    context.client.setQueryData(listStageMaterialInvoicesQueryKey({ path: { stageId: 11 } }), [paidInvoice]);
    await act(async () => {
      await probe.payment.submit({ amount: '95 000', date: '2026-10-16' });
    });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.invalidate).not.toHaveBeenCalled();
    expect(probe.payment.form.getValues()).toEqual({ amount: '95000', date: '2026-10-16' });
    expect(probe.payment.form.formState.isDirty).toBe(false);
  });

  it('does not clear an already unpaid invoice', async () => {
    await act(async () => {
      await probe.payment.clear();
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('skips delivery when the query cache already contains the requested state', async () => {
    const delivered = { ...invoice, deliveredAt: invoice.createdAt, version: 7 };
    context.client.setQueryData(listStageMaterialInvoicesQueryKey({ path: { stageId: 11 } }), [delivered]);
    await act(async () => {
      await probe.delivery.toggle();
    });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });

  it('uses the response as form defaults and skips a repeated save before refetch', async () => {
    await act(async () => {
      await probe.payment.submit({ amount: '95000', date: '2026-10-16' });
    });
    await act(async () => {
      await probe.payment.submit({ amount: '95 000', date: '2026-10-16' });
    });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(probe.payment.form.formState.isDirty).toBe(false);
    const cached = context.client.getQueryData<StageMaterialInvoice[]>(
      listStageMaterialInvoicesQueryKey({ path: { stageId: 11 } }),
    );
    expect(cached?.[0]?.version).toBe(3);
    expect(cached?.[0]?.paidAmountMinor).toBe(9_500_000n);
  });

  it('refreshes untouched fields but retains dirty fields when server data changes', async () => {
    const paidInvoice = { ...invoice, paidAmountMinor: 9_500_000n, paidDate: '2026-10-16', paidAt: invoice.createdAt };
    async function renderPayment(paymentInvoice: StageMaterialInvoice) {
      await act(async () => {
        context.root.render(
          <QueryClientProvider client={context.client}>
            <Probe version={paymentInvoice.version} paymentInvoice={paymentInvoice} />
          </QueryClientProvider>,
        );
        await Promise.resolve();
      });
    }
    await renderPayment(paidInvoice);
    expect(probe.payment.hasChanges).toBe(false);
    await act(async () => {
      probe.payment.form.setValue('amount', '96000', { shouldDirty: true });
      await Promise.resolve();
    });
    expect(probe.payment.hasChanges).toBe(true);
    await renderPayment({ ...paidInvoice, paidAmountMinor: 9_700_000n, paidDate: '2026-10-17', version: 3 });
    expect(probe.payment.form.getValues()).toEqual({ amount: '96000', date: '2026-10-17' });
    await act(async () => {
      probe.payment.form.setValue('amount', '97 000', { shouldDirty: true });
      await Promise.resolve();
    });
    expect(probe.payment.hasChanges).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
