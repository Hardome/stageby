import { act, useLayoutEffect } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';

import { editStage } from '@tests/project-edit-fixture';

import { listStageMaterialInvoicesQueryKey } from '@api/queries/useListStageMaterialInvoices';
import type { StageMaterialInvoice } from '@api/types';

import { useInvoiceCreate } from './use-invoice-create';
import { useInvoiceDelivery } from './use-invoice-delivery';
import { useInvoicePayment } from './use-invoice-payment';
import { useInvoiceShortages } from './use-invoice-shortages';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  shortage: vi.fn(),
  resolve: vi.fn(),
  invalidate: vi.fn(),
  access: vi.fn(),
  list: vi.fn(),
  stage: vi.fn(),
}));
vi.mock('@api/clients/createStageMaterialInvoice', () => ({
  createStageMaterialInvoice: (options: unknown) => ({ unwrap: () => mocks.create(options) as Promise<unknown> }),
}));
vi.mock('@api/clients/updateMaterialInvoice', () => ({
  updateMaterialInvoice: (options: unknown) => ({ unwrap: () => mocks.update(options) as Promise<unknown> }),
}));
vi.mock('@api/clients/createMaterialShortage', () => ({
  createMaterialShortage: (options: unknown) => ({ unwrap: () => mocks.shortage(options) as Promise<unknown> }),
}));
vi.mock('@api/clients/resolveMaterialShortage', () => ({
  resolveMaterialShortage: (options: unknown) => ({ unwrap: () => mocks.resolve(options) as Promise<unknown> }),
}));
vi.mock('@api/clients/listStageMaterialInvoices', () => ({
  listStageMaterialInvoices: () => ({ unwrap: mocks.list }),
}));
vi.mock('@api/clients/getStage', () => ({ getStage: () => ({ unwrap: mocks.stage }) }));
vi.mock('@entities/stage', () => ({ invalidateStage: mocks.invalidate }));
vi.mock('@shared/lib/hooks', async (original) => ({
  ...(await original<object>()),
  useAccessError: () => mocks.access,
}));
vi.mock('@shared/lib/file-upload', async (original) => ({
  ...(await original<object>()),
  uploadFile: (_item: unknown, update: (values: object) => void) => {
    update({ fileId: 41 });
    return Promise.resolve();
  },
}));

const invoice: StageMaterialInvoice = {
  id: 401,
  stageId: 11,
  fileId: 41,
  amountMinor: 10_000_000n,
  supplierName: null,
  paidAmountMinor: null,
  paidDate: null,
  paidAt: null,
  paidBy: null,
  deliveredAt: null,
  deliveredBy: null,
  shortages: [],
  version: 2,
  createdAt: '2026-10-16T00:00:00Z',
  updatedAt: '2026-10-16T00:00:00Z',
};
const probe = {
  create: {} as ReturnType<typeof useInvoiceCreate>,
  payment: {} as ReturnType<typeof useInvoicePayment>,
  delivery: {} as ReturnType<typeof useInvoiceDelivery>,
  shortage: {} as ReturnType<typeof useInvoiceShortages>,
};

function Probe({ version, paymentInvoice }: { version: number; paymentInvoice?: StageMaterialInvoice }) {
  const { stage } = editStage();
  const create = useInvoiceCreate(stage);
  const payment = useInvoicePayment(stage, paymentInvoice ?? { ...invoice, version });
  const delivery = useInvoiceDelivery(stage, paymentInvoice ?? { ...invoice, version });
  const shortage = useInvoiceShortages(stage, invoice);
  useLayoutEffect(() => {
    Object.assign(probe, { create, payment, shortage, delivery });
  });
  return null;
}

describe('material invoice actions', () => {
  let root: Root;
  let client: QueryClient;
  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.resetAllMocks();
    mocks.invalidate.mockResolvedValue(undefined);
    mocks.stage.mockResolvedValue(editStage().stage);
    mocks.list.mockResolvedValue([{ ...invoice, version: 5 }]);
    client = new QueryClient();
    client.setQueryData(listStageMaterialInvoicesQueryKey({ path: { stageId: 11 } }), [invoice]);
    mocks.update.mockImplementation(
      (options: { body: { expectedVersion: number; isPaid?: boolean; paidAmountMinor?: bigint; paidDate?: string } }) =>
        Promise.resolve({
          ...invoice,
          paidAmountMinor: options.body.isPaid ? options.body.paidAmountMinor : null,
          paidDate: options.body.isPaid ? options.body.paidDate : null,
          paidAt: options.body.isPaid ? invoice.createdAt : null,
          version: options.body.expectedVersion + 1,
        }),
    );
    root = createRoot(document.createElement('div'));
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <Probe version={2} />
        </QueryClientProvider>,
      );
      await Promise.resolve();
    });
  });
  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    client.clear();
    // cspell:ignore unstub
    vi.unstubAllGlobals();
  });

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
    expect(probe.payment.form.getValues()).toEqual({ amount: '', date: '' });
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
      root.render(
        <QueryClientProvider client={client}>
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

  it('skips unchanged payments using the latest query cache, including formatted amounts', async () => {
    const paidInvoice = {
      ...invoice,
      paidAmountMinor: 9_500_000n,
      paidDate: '2026-10-16',
      paidAt: invoice.createdAt,
      version: 7,
    };
    client.setQueryData(listStageMaterialInvoicesQueryKey({ path: { stageId: 11 } }), [paidInvoice]);
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
    client.setQueryData(listStageMaterialInvoicesQueryKey({ path: { stageId: 11 } }), [delivered]);
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
    const cached = client.getQueryData<StageMaterialInvoice[]>(
      listStageMaterialInvoicesQueryKey({ path: { stageId: 11 } }),
    );
    expect(cached?.[0]?.version).toBe(3);
    expect(cached?.[0]?.paidAmountMinor).toBe(9_500_000n);
  });

  it('refreshes untouched fields but retains dirty fields when server data changes', async () => {
    const paidInvoice = { ...invoice, paidAmountMinor: 9_500_000n, paidDate: '2026-10-16', paidAt: invoice.createdAt };
    async function renderPayment(paymentInvoice: StageMaterialInvoice) {
      await act(async () => {
        root.render(
          <QueryClientProvider client={client}>
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
