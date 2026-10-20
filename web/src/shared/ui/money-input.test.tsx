import { act, type ComponentProps, useState } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { MoneyInput } from './money-input';

const changed = vi.fn();

async function flush(action: () => void) {
  await act(async () => {
    action();
    await Promise.resolve();
  });
}

function ControlledInput({
  initialValue,
  ...properties
}: Partial<ComponentProps<typeof MoneyInput>> & { initialValue: string }) {
  const [amount, setAmount] = useState(initialValue);

  return (
    <MoneyInput
      value={amount}
      onValueChange={(nextValue) => {
        changed(nextValue);
        setAmount(nextValue);
      }}
      {...properties}
    />
  );
}

describe('MoneyInput', () => {
  let container: HTMLDivElement;
  let root: Root;

  function input() {
    const element = container.querySelector('input');
    if (!element) throw new Error('Missing money input');

    return element;
  }

  async function renderInput(value = '', properties: Partial<ComponentProps<typeof MoneyInput>> = {}) {
    await flush(() => root.render(<ControlledInput initialValue={value} {...properties} />));
  }

  async function fill(value: string, start = value.length, end = start) {
    await flush(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input(), value);
      input().setSelectionRange(start, end);
      input().dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    changed.mockReset();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await flush(() => root.unmount());
    container.remove();
    // cspell:ignore unstub
    vi.unstubAllGlobals();
  });

  it.each([
    ['', ''],
    ['0', '0'],
    ['999', '999'],
    ['1000', '1 000'],
    ['1000000', '1 000 000'],
    ['1 000 000', '1 000 000'],
    ['1\u{A0}000\u{202F}000', '1 000 000'],
    ['90071992547410', '90 071 992 547 410'],
  ])('formats %s on input and external updates', async (value, expected) => {
    await renderInput();
    await fill(value);
    expect(input()).toHaveValue(expected);
    await flush(() => root.render(<MoneyInput value={value} onValueChange={changed} />));
    expect(input()).toHaveValue(expected);
  });

  it.each(['-1', '1.5', '1,50', '12x', '1e3'])(
    'rejects invalid input %s without changing the amount',
    async (value) => {
      await renderInput('1000');

      await fill(value);

      expect(input()).toHaveValue('1 000');
      expect(changed).not.toHaveBeenCalled();
    },
  );

  it('preserves caret and selection when grouping changes', async () => {
    await renderInput();
    await fill('1234567', 3);
    expect(input()).toHaveValue('1 234 567');
    expect(input().selectionStart).toBe(4);
    await fill('12345678', 2, 5);
    expect(input()).toHaveValue('12 345 678');
    expect(input().selectionStart).toBe(2);
    expect(input().selectionEnd).toBe(6);
  });

  it.each([
    ['Backspace', 2, '234 567', 0],
    ['Delete', 1, '134 567', 1],
  ])('deletes a digit across a separator with %s', async (key, position, expected, caret) => {
    await renderInput('1234567');
    input().setSelectionRange(position, position);
    await flush(() => {
      input().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    });
    expect(input()).toHaveValue(expected);
    expect(input().selectionStart).toBe(caret);
    expect(changed).toHaveBeenLastCalledWith(expected);
  });

  it('allows clearing and replacing a selected amount', async () => {
    await renderInput('1000000');
    await fill('2500');
    expect(input()).toHaveValue('2 500');
    await fill('');
    expect(input()).toHaveValue('');
    expect(changed).toHaveBeenLastCalledWith('');
  });

  it('forwards refs, blur, disabled and accessibility properties', async () => {
    const reference = { current: null as HTMLInputElement | null };
    const blurred = vi.fn();
    await renderInput('1000', { ref: reference, onBlur: blurred, 'aria-invalid': true, disabled: true });
    expect(reference.current).toBe(input());
    expect(input()).toBeDisabled();
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    await renderInput('1000', { onBlur: blurred });
    await flush(() => input().dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    expect(blurred).toHaveBeenCalledOnce();
  });
});
