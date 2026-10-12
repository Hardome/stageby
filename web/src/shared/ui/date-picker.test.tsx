import { act, createRef, useState } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { DatePicker } from './date-picker';

// cspell:ignore ГГГГ

async function flush(action: () => void) {
  await act(async () => {
    action();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const changed = vi.fn();
const reference = createRef<HTMLInputElement | HTMLButtonElement>();

function Example({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState('2026-10-05');
  return (
    <DatePicker
      id="date"
      aria-labelledby="date-label"
      value={value}
      min="2026-10-03"
      max="2026-10-10"
      ref={reference}
      disabled={disabled}
      onChange={(date) => {
        changed(date);
        setValue(date);
      }}
    />
  );
}

function day(date: string) {
  const element = [...document.querySelectorAll<HTMLButtonElement>('button[data-day]')].find(
    (button) => button.dataset.day === date,
  );
  if (!element) throw new Error(`Missing calendar day ${date}`);
  return element;
}

describe('adaptive date picker', () => {
  let container: HTMLDivElement;
  let root: Root;
  let media: MediaQueryList;
  let isCoarse: boolean;
  function trigger() {
    const element = container.querySelector<HTMLButtonElement>('button[aria-label="Открыть календарь"]');
    if (!element) throw new Error('Missing date control');
    return element;
  }

  beforeEach(() => {
    isCoarse = false;
    changed.mockReset();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    media = new EventTarget() as MediaQueryList;
    Object.defineProperty(media, 'matches', { get: () => isCoarse });
    vi.stubGlobal('matchMedia', (query: string) =>
      query === '(pointer: coarse)'
        ? media
        : {
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          },
    );
    container = document.createElement('div');
    document.body.append(container);
    container.innerHTML = '<label id="date-label" for="date">Дата</label>';
    root = createRoot(container);
  });

  afterEach(async () => {
    await flush(() => root.unmount());
    container.remove();
    // cspell:ignore unstub
    vi.unstubAllGlobals();
  });

  it('selects a permitted day, closes the calendar and returns focus', async () => {
    await flush(() => root.render(<Example />));
    expect(container.querySelector('input')).toHaveValue('05.10.2026');
    await flush(() => trigger().click());
    expect(day('02.10.2026')).toBeDisabled();
    expect(day('11.10.2026')).toBeDisabled();
    await flush(() => day('06.10.2026').click());
    expect(changed).toHaveBeenLastCalledWith('2026-10-06');
    expect(container.querySelector('input')).toHaveValue('06.10.2026');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(reference.current).toBe(container.querySelector('input'));
    expect(trigger()).toHaveFocus();
  });

  it('clears the selected date without submitting a form', async () => {
    await flush(() => root.render(<Example />));
    await flush(() => trigger().click());
    const clear = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Очистить дату');
    expect(clear).toHaveAttribute('type', 'button');
    await flush(() => clear?.click());
    expect(changed).toHaveBeenLastCalledWith('');
    expect(container.querySelector('input')).toHaveValue('');
  });

  it('keeps the date and constraints when switching to the native control', async () => {
    await flush(() => root.render(<Example />));
    await flush(() => {
      isCoarse = true;
      media.dispatchEvent(new Event('change'));
    });
    const input = container.querySelector<HTMLInputElement>('input');
    expect(input).toHaveAttribute('type', 'date');
    expect(input).toHaveValue('2026-10-05');
    expect(input).toHaveAttribute('min', '2026-10-03');
    expect(input).toHaveAttribute('max', '2026-10-10');
    await flush(() => {
      if (!input) throw new Error('Missing native date input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '2026-10-08');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(changed).toHaveBeenLastCalledWith('2026-10-08');
    await flush(() => {
      isCoarse = false;
      media.dispatchEvent(new Event('change'));
    });
    expect(container.querySelector('input')).toHaveValue('08.10.2026');
  });

  it('supports keyboard navigation and closes with Escape', async () => {
    await flush(() => root.render(<Example />));
    await flush(() => trigger().click());
    expect(day('05.10.2026')).toHaveFocus();
    await flush(() =>
      day('05.10.2026').dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
        }),
      ),
    );
    expect(day('06.10.2026')).toHaveFocus();
    await flush(() =>
      day('06.10.2026').dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
        }),
      ),
    );
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(trigger()).toHaveFocus();
    expect(changed).not.toHaveBeenCalled();
  });

  async function typeDate(value: string) {
    await flush(() => {
      const input = container.querySelector('input');
      if (!input) throw new Error('Missing date input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  it('converts manual input and selects the same day in the calendar', async () => {
    await flush(() => root.render(<Example />));
    await typeDate('08.10.2026');
    expect(changed).toHaveBeenLastCalledWith('2026-10-08');
    expect(container.querySelector('input')).toHaveValue('08.10.2026');
    await flush(() => trigger().click());
    expect(day('08.10.2026')).toHaveAttribute('data-selected-single', 'true');
    await flush(() => day('09.10.2026').click());
    expect(container.querySelector('input')).toHaveValue('09.10.2026');
  });

  it('opens the calendar on input clicks while allowing typing without losing focus', async () => {
    await flush(() => root.render(<Example />));
    const input = container.querySelector('input');
    if (!input) throw new Error('Missing date input');
    await flush(() => {
      input.focus();
      input.click();
    });
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveFocus();
    await typeDate('08.10.2026');
    expect(changed).toHaveBeenLastCalledWith('2026-10-08');
    expect(day('08.10.2026')).toHaveAttribute('data-selected-single', 'true');
    expect(input).toHaveFocus();
    await flush(() => day('09.10.2026').click());
    expect(input).toHaveValue('09.10.2026');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    await flush(() => {
      input.focus();
      input.click();
    });
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveFocus();
  });

  it('retains incomplete and impossible dates for form validation', async () => {
    await flush(() => root.render(<Example />));
    await typeDate('31.02.');
    expect(container.querySelector('input')).toHaveValue('31.02.');
    expect(changed).toHaveBeenLastCalledWith('31.02.');
    await typeDate('31.02.2026');
    await flush(() => {
      container.querySelector('input')?.focus();
      container.querySelector('input')?.blur();
    });
    expect(container.querySelector('input')).not.toHaveAttribute('aria-invalid', 'true');
    expect(container.textContent).not.toContain('Введите дату в формате ДД.ММ.ГГГГ.');
    expect(changed).toHaveBeenLastCalledWith('31.02.2026');
    await typeDate('09.10.2026');
    expect(container.querySelector('input')).not.toHaveAttribute('aria-invalid', 'true');
    await typeDate('');
    expect(changed).toHaveBeenLastCalledWith('');
  });

  it('converts valid leap days and passes manual dates outside calendar bounds to the form', async () => {
    await flush(() => root.render(<Example />));
    await typeDate('29.02.2024');
    expect(changed).toHaveBeenLastCalledWith('2024-02-29');
    await typeDate('29.02.2025');
    expect(changed).toHaveBeenLastCalledWith('29.02.2025');
    await typeDate('11.10.2026');
    await flush(() => {
      container.querySelector('input')?.focus();
      container.querySelector('input')?.blur();
    });
    expect(changed).toHaveBeenLastCalledWith('2026-10-11');
    expect(container.querySelector('input')).toHaveValue('11.10.2026');
    expect(container.textContent).not.toContain('Дата находится вне допустимого диапазона.');
    await typeDate('10.10.2026');
    expect(container.querySelector('input')).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('forwards the form error attributes and blur handler without adding an error message', async () => {
    const onBlur = vi.fn();
    await flush(() =>
      root.render(
        <DatePicker value="31.02.2026" onChange={changed} onBlur={onBlur} aria-invalid aria-describedby="date-error" />,
      ),
    );
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'date-error');
    await flush(() => {
      input?.focus();
      input?.blur();
    });
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain('Введите дату');
  });

  it('disables both controls', async () => {
    await flush(() => root.render(<Example disabled />));
    expect(trigger()).toBeDisabled();
    await flush(() => {
      isCoarse = true;
      media.dispatchEvent(new Event('change'));
    });
    expect(container.querySelector('input')).toBeDisabled();
  });
});
