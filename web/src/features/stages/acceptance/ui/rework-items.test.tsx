// cspell:ignore unstub
import { act } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { createRoot, type Root } from 'react-dom/client';
import { useForm } from 'react-hook-form';

import { editStage } from '@tests/project-edit-fixture';

import { reworkFormSchema } from '../lib/rework-form';
import type { ReworkFormValues } from '../model/types';
import { ReworkItems } from './rework-items';

const first = editStage().checklist.items[0];
if (!first) throw new Error('Нет пункта чек-листа');
const items = [first, { ...first, id: 212, title: 'Соединения', position: 2 }];

interface FormProperties {
  submit: (values: ReworkFormValues) => void;
}

function Form({ submit }: Readonly<FormProperties>) {
  const schema = reworkFormSchema(
    items.map((item) => item.id),
    '2026-10-16',
  );
  const form = useForm<ReworkFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [], correctionDueDate: '2026-10-18' },
  });

  return (
    <form noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)}>
      <ReworkItems form={form} items={items} />
      <button type="submit">Отправить</button>
    </form>
  );
}

describe('individual rework comments', () => {
  let container: HTMLDivElement;
  let root: Root;
  const submit = vi.fn<(values: ReworkFormValues) => void>();

  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    submit.mockClear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<Form submit={submit} />);
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

  async function toggle(id: number) {
    await act(async () => {
      container.querySelector<HTMLElement>(`#rework-item-${id}`)?.click();
      await Promise.resolve();
    });
  }

  function input(id: number) {
    const textarea = container.querySelector<HTMLTextAreaElement>(`#rework-comment-${id}`);
    if (!textarea) throw new Error('Нет поля замечания');

    return textarea;
  }

  async function fill(id: number, value: string) {
    await act(async () => {
      const textarea = input(id);
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(textarea, value);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
  }

  async function send() {
    await act(async () => {
      container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
  }

  it('sends independent comments and retains drafts when selection shifts', async () => {
    await toggle(211);
    await toggle(212);
    await fill(211, ' Исправить угол ');
    await fill(212, 'Убрать зазор');
    await toggle(211);
    expect(input(212)).toHaveValue('Убрать зазор');
    await send();
    expect(submit.mock.calls[0]?.[0].items).toEqual([{ itemId: 212, comment: 'Убрать зазор' }]);

    await toggle(211);
    expect(input(211)).toHaveValue(' Исправить угол ');
    await send();
    expect(submit.mock.calls[1]?.[0].items).toEqual([
      { itemId: 212, comment: 'Убрать зазор' },
      { itemId: 211, comment: 'Исправить угол' },
    ]);
  });

  it('requires a selection and a meaningful comment for every selected item', async () => {
    await send();
    expect(container).toHaveTextContent('Выберите хотя бы один пункт.');
    await toggle(211);
    await toggle(212);
    await fill(211, 'Исправить угол');
    await fill(212, ' '.repeat(3));
    await send();
    expect(input(212)).toHaveAttribute('aria-invalid', 'true');
    expect(input(211)).toHaveAttribute('aria-invalid', 'false');
    expect(submit).not.toHaveBeenCalled();
  });
});
