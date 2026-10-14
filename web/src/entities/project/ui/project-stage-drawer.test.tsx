import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { ProjectStageDrawer } from './project-stage-drawer';

// cspell:ignore unstub

const stages = [
  { index: 0, title: 'Фундамент', hasError: true },
  { index: 2, title: 'Крыша', hasError: false },
];

async function flush(action: () => void) {
  await act(async () => {
    action();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function button(label: string) {
  const element = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.getAttribute('aria-label') === label,
  );
  if (!element) throw new Error(`Missing button ${label}`);

  return element;
}

describe('project stage drawer', () => {
  let media: MediaQueryList;
  let isDesktop: boolean;
  let container: HTMLDivElement;
  let root: Root;
  const changed = vi.fn();
  const scrollIntoView = vi.fn();
  const originalScroll = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');

  beforeEach(() => {
    changed.mockReset();
    scrollIntoView.mockReset();
    isDesktop = false;
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    media = new EventTarget() as MediaQueryList;
    Object.defineProperty(media, 'matches', { get: () => isDesktop });
    vi.stubGlobal('matchMedia', (query: string) =>
      query === '(min-width: 1024px)'
        ? media
        : {
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          },
    );
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await flush(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    if (originalScroll) Object.defineProperty(Element.prototype, 'scrollIntoView', originalScroll);
    else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  });

  async function renderDrawer(isDisabled = false, availableStages = stages) {
    await flush(() =>
      root.render(
        <ProjectStageDrawer stages={availableStages} currentStage={2} disabled={isDisabled} onStageChange={changed} />,
      ),
    );
  }

  it('opens an accessible list, reveals the current stage, selects its original index and closes', async () => {
    await renderDrawer();

    expect(container.querySelector('[aria-label="Этапов с ошибками: 1"]')).not.toBeNull();

    await flush(() => button('Выбрать этап: Крыша').click());
    const dialog = document.querySelector('[role="dialog"]');

    expect(dialog).toHaveAccessibleName('Этапы проекта');
    expect(button('Этап 2. Крыша')).toHaveAttribute('aria-current', 'step');
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalled());

    const heading = document.createElement('h2');
    heading.tabIndex = -1;
    container.append(heading);
    changed.mockImplementationOnce(() => heading.focus());

    await flush(() => button('Этап 1. Фундамент. Есть ошибки').click());

    await vi.waitFor(() => expect(changed).toHaveBeenCalledWith(0));
    await vi.waitFor(() => expect(heading).toHaveFocus());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('closes with the close button and Escape and restores trigger focus without a selection', async () => {
    await renderDrawer();
    const trigger = button('Выбрать этап: Крыша');
    await flush(() => {
      trigger.focus();
      trigger.click();
    });
    await flush(() => button('Закрыть список этапов').click());

    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    await vi.waitFor(() => expect(trigger).toHaveFocus());
    await flush(() => trigger.click());
    await flush(() =>
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
        }),
      ),
    );

    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    expect(changed).not.toHaveBeenCalled();
  });

  it('closes when locked or resized to desktop and disables an empty selector', async () => {
    await renderDrawer();
    await flush(() => button('Выбрать этап: Крыша').click());
    await renderDrawer(true);

    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    await renderDrawer();
    await flush(() => button('Выбрать этап: Крыша').click());
    await flush(() => {
      isDesktop = true;
      media.dispatchEvent(new Event('change'));
    });

    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    await renderDrawer(false, []);

    expect(button('Выбрать этап: Выберите этапы')).toBeDisabled();
    expect(changed).not.toHaveBeenCalled();
  });
});
