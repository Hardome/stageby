// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';
import { useForm } from 'react-hook-form';

import { editStage } from '@tests/project-edit-fixture';

import type { StageMaterialInvoice } from '@api/types';

import { InvoiceDeliveryCheckDialog } from './invoice-delivery-check-dialog';

const mocks = vi.hoisted(() => ({ close: vi.fn(), submit: vi.fn() }));
vi.mock('../lib/use-invoice-shortages', () => ({
  useInvoiceShortages: (_stage: unknown, _invoice: unknown, onSaved: () => void) => ({
    form: useForm({ defaultValues: { comment: '' } }),
    action: { pending: false, blocked: false, message: '' },
    submit: (values: { comment: string }) => {
      mocks.submit(values);
      onSaved();
    },
  }),
}));

async function click(label: string) {
  const button = [...document.querySelectorAll('button')].find((element) => element.textContent === label);
  if (!button) throw new Error(`Кнопка «${label}» не найдена.`);
  await act(async () => {
    button.click();
    await Promise.resolve();
  });
}

describe('delivery completeness check', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <InvoiceDeliveryCheckDialog
          stage={editStage().stage}
          invoice={{ id: 401 } as StageMaterialInvoice}
          onClose={mocks.close}
        />,
      );
      await Promise.resolve();
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('closes without reporting a shortage when all materials arrived', async () => {
    expect(document.body).toHaveTextContent('Всё ли доехало?');

    await click('Всё в порядке');

    expect(mocks.close).toHaveBeenCalledOnce();
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('allows describing a shortage and closes after reporting it', async () => {
    await click('Есть нехватка');

    expect(document.body).toHaveTextContent('Каких материалов не хватает?');

    const textarea = document.querySelector('textarea');
    expect(textarea).not.toBeNull();

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
        textarea,
        'Не привезли крепёж',
      );
      textarea?.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => {
      document.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    expect(mocks.submit).toHaveBeenCalledWith({ comment: 'Не привезли крепёж' });
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
