import { act, useLayoutEffect } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';

import { editStage } from '@tests/project-edit-fixture';

import { listStageMaterialInvoicesQueryKey } from '@api/queries/useListStageMaterialInvoices';
import type { StageMaterialInvoice } from '@api/types';

import { useInvoiceCreate } from './use-invoice-create';
import { useInvoiceDelivery } from './use-invoice-delivery';
import { useInvoiceEditor } from './use-invoice-editor';
import { useInvoicePayment } from './use-invoice-payment';
import { useInvoiceShortages } from './use-invoice-shortages';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  saved: vi.fn(),
  delivered: vi.fn(),
  shortage: vi.fn(),
  resolve: vi.fn(),
  invalidate: vi.fn(),
  access: vi.fn(),
  list: vi.fn(),
  stage: vi.fn(),
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
  editor: {} as ReturnType<typeof useInvoiceEditor>,
  shortage: {} as ReturnType<typeof useInvoiceShortages>,
};

interface ProbeProperties {
  version: number;
  paymentInvoice?: StageMaterialInvoice;
}

function Probe({ version, paymentInvoice }: ProbeProperties) {
  const { stage } = editStage();
  const create = useInvoiceCreate(stage);
  const payment = useInvoicePayment(stage, paymentInvoice ?? { ...invoice, version });
  const delivery = useInvoiceDelivery(stage, paymentInvoice ?? { ...invoice, version }, mocks.delivered);
  const shortage = useInvoiceShortages(stage, invoice);
  const editor = useInvoiceEditor(stage, invoice, mocks.saved);

  useLayoutEffect(() => {
    Object.assign(probe, { create, payment, shortage, delivery, editor });
  });

  return null;
}

vi.mock('@api/clients/createStageMaterialInvoice', () => ({
  createStageMaterialInvoice: (options: unknown) => ({ unwrap: () => mocks.create(options) as Promise<unknown> }),
}));
vi.mock('@api/clients/updateMaterialInvoice', () => ({
  updateMaterialInvoice: (options: unknown) => ({ unwrap: () => mocks.update(options) as Promise<unknown> }),
}));
vi.mock('@api/clients/deleteMaterialInvoice', () => ({
  deleteMaterialInvoice: (options: unknown) => ({ unwrap: () => mocks.remove(options) as Promise<unknown> }),
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

export function setupTest() {
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

  return {
    get root() {
      return root;
    },
    get client() {
      return client;
    },
  };
}

export { invoice, mocks, Probe, probe };
