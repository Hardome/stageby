import { act } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { listStageMaterialInvoicesQueryKey } from '@api/queries/useListStageMaterialInvoices';

import { invoice, mocks, Probe, probe, setupTest } from './material-actions-test-setup';

describe('invoice delivery completion', () => {
  const context = setupTest();

  it('asks about completeness only after delivery and dependent data have been saved', async () => {
    const refreshing = Promise.withResolvers<void>();
    mocks.invalidate.mockReturnValue(refreshing.promise);
    let completion: Promise<void>;

    await act(async () => {
      completion = probe.delivery.toggle();
      await Promise.resolve();
    });

    expect(mocks.update).toHaveBeenCalledWith({
      path: { invoiceId: 401 },
      body: { expectedVersion: 2, isDelivered: true },
    });
    expect(mocks.invalidate).toHaveBeenCalledOnce();
    expect(mocks.delivered).not.toHaveBeenCalled();

    await act(async () => {
      refreshing.resolve();
      await completion;
    });

    expect(mocks.delivered).toHaveBeenCalledOnce();
  });

  it('keeps the question closed when delivery fails', async () => {
    mocks.update.mockRejectedValueOnce(new Error('Delivery failed'));

    await act(async () => {
      await probe.delivery.toggle();
    });

    expect(mocks.delivered).not.toHaveBeenCalled();
    expect(mocks.invalidate).not.toHaveBeenCalled();
    expect(probe.delivery.action.message).toContain('Не удалось сохранить');
  });

  it('does not ask about completeness when undoing delivery', async () => {
    const delivered = { ...invoice, deliveredAt: invoice.createdAt };
    context.client.setQueryData(listStageMaterialInvoicesQueryKey({ path: { stageId: 11 } }), [delivered]);

    await act(async () => {
      context.root.render(
        <QueryClientProvider client={context.client}>
          <Probe version={2} paymentInvoice={delivered} />
        </QueryClientProvider>,
      );
      await Promise.resolve();
    });

    await act(async () => {
      await probe.delivery.toggle();
    });

    expect(mocks.delivered).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith({
      path: { invoiceId: 401 },
      body: { expectedVersion: 2, isDelivered: false },
    });
  });
});
