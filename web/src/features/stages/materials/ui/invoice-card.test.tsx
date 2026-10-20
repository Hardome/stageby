// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { editStage } from '@tests/project-edit-fixture';

import type { StageMaterialInvoice } from '@api/types';

import { ForemanInvoiceList } from './foreman-invoice-list';
import { ManagerInvoiceList } from './manager-invoice-list';

const mocks = vi.hoisted(() => ({ open: vi.fn(), delivery: vi.fn() }));
vi.mock('../lib/use-invoice-file', () => ({
  useInvoiceFile: () => ({ open: mocks.open, pending: false, message: '' }),
}));
vi.mock('../lib/use-invoice-delivery', () => ({
  useInvoiceDelivery: () => ({ action: { blocked: false, pending: false }, toggle: mocks.delivery }),
}));
vi.mock('./invoice-payment-dialog', () => ({ InvoicePaymentDialog: () => <div>Форма оплаты</div> }));
vi.mock('./invoice-shortage-dialog', () => ({ InvoiceShortageDialog: () => <div>Форма нехватки</div> }));
vi.mock('./invoice-editor', () => ({ InvoiceEditor: () => <div>Редактор счёта</div> }));
vi.mock('./invoice-create', () => ({ InvoiceCreate: () => <button type="button">Добавить счёт</button> }));

const invoice: StageMaterialInvoice = {
  id: 401,
  stageId: 11,
  fileId: 41,
  amountMinor: 10_000_000n,
  supplierName: 'Поставщик',
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

describe('invoice list row', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  async function render(canManage: boolean, canReceive: boolean) {
    await act(async () => {
      root.render(
        canManage ? (
          <ManagerInvoiceList stage={editStage().stage} invoices={[invoice]} canManage />
        ) : (
          <ForemanInvoiceList stage={editStage().stage} invoices={[invoice]} canReceive={canReceive} />
        ),
      );
      await Promise.resolve();
    });
  }

  it('opens the invoice file from the menu and keeps the invoice row non-interactive', async () => {
    await render(false, false);

    expect(container).toHaveTextContent('Поставщик');
    expect(container).toHaveTextContent('Не оплачен');
    expect(container).toHaveTextContent('Не доставлен');
    expect(container).not.toHaveTextContent('Подробности');
    expect(container.querySelector('[aria-label="Посмотреть счёт №1"]')).toBeNull();

    await click('Действия со счётом');
    await click('Посмотреть счёт');

    expect(mocks.open).toHaveBeenCalledOnce();
  });

  it('gives the foreman delivery, shortage and file actions through the menu', async () => {
    await render(false, true);

    expect(container.querySelector('[aria-label="Действия со счётом"]')).not.toBeNull();
    expect(container).not.toHaveTextContent('Внести оплату');

    await click('Действия со счётом');

    expect(document.body).not.toHaveTextContent('Внести оплату');
    expect(document.body).not.toHaveTextContent('Изменить счёт');

    await click('Подтвердить доставку');

    expect(mocks.delivery).toHaveBeenCalledOnce();

    await click('Действия со счётом');
    await click('Сообщить о нехватке');

    expect(container).toHaveTextContent('Форма нехватки');
  });

  it('gives the manager payment actions only inside the menu', async () => {
    await render(true, true);

    expect(container.querySelector('[aria-label="Действия со счётом"]')).not.toBeNull();
    expect(container).not.toHaveTextContent('Внести оплату');

    await click('Действия со счётом');
    await click('Внести оплату');

    expect(container).toHaveTextContent('Форма оплаты');
  });

  it('does not display mutation actions for a viewer', async () => {
    await render(false, false);

    expect(container.querySelector('[aria-label="Действия со счётом"]')).not.toBeNull();
    expect(container).not.toHaveTextContent('Внести оплату');
    expect(container).not.toHaveTextContent('Подтвердить доставку');
    expect(container).not.toHaveTextContent('Сообщить о нехватке');
  });
});

async function click(text: string) {
  const button = [...document.querySelectorAll<HTMLElement>('button, [role="menuitem"]')].find(
    (element) => element.textContent?.trim() === text || element.getAttribute('aria-label') === text,
  );
  if (!button) throw new Error(`Кнопка не найдена: ${text}`);
  await act(async () => {
    button.click();
    await Promise.resolve();
  });
}
