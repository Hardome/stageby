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

function Example({ disabled = false }: Readonly<{ disabled?: boolean }>) {
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

export function setupTest() {
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

  async function typeDate(value: string) {
    await flush(() => {
      const input = container.querySelector('input');
      if (!input) throw new Error('Missing date input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  return {
    get root() {
      return root;
    },
    get container() {
      return container;
    },
    get media() {
      return media;
    },
    get isCoarse() {
      return isCoarse;
    },
    trigger,
    typeDate,
    set isCoarse(value: boolean) {
      isCoarse = value;
    },
  };
}

export { changed, day, Example, flush, reference };
