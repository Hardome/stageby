// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { editStage } from '@tests/project-edit-fixture';

import { ProjectStages } from './project-stages';

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), retry: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a href="/stages/11">{children}</a>,
}));

describe('project stage display modes', () => {
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

  async function render(isPending = false, hasError = false) {
    await act(async () => {
      root.render(
        <ProjectStages
          stages={isPending ? undefined : [editStage().stage]}
          isPending={isPending}
          isFetching={isPending}
          hasError={hasError}
          onRetry={mocks.retry}
        />,
      );
      await Promise.resolve();
    });
  }

  async function select(label: string) {
    await act(async () => {
      container.querySelector<HTMLButtonElement>(`[aria-label="${CSS.escape(label)}"]`)?.click();
      await Promise.resolve();
    });
  }

  it('loads the selected table layout, opens its rows by click and keyboard and returns to cards', async () => {
    await render(true);
    await select('Таблица');

    expect(container.querySelector('table')).toHaveAttribute('aria-label', 'Загрузка этапов объекта');
    expect(container).toHaveTextContent('Работы: план / факт');

    await render();

    const row = container.querySelector<HTMLElement>('tr[role="link"]');
    expect(row).not.toBeNull();

    await act(async () => {
      row?.click();
      await Promise.resolve();
    });

    expect(mocks.navigate).toHaveBeenLastCalledWith({ to: '/stages/$stageId', params: { stageId: '11' } });

    mocks.navigate.mockClear();
    await act(async () => {
      row?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await Promise.resolve();
    });

    expect(mocks.navigate).toHaveBeenCalledOnce();

    await select('Карточки');

    expect(container.querySelector('table')).toBeNull();
    expect(container.querySelector('h3')).toHaveTextContent(editStage().stage.title);
  });

  it('keeps the table and retry available after a background error', async () => {
    await render();
    await select('Таблица');
    await render(false, true);

    expect(container.querySelector('tr[role="link"]')).not.toBeNull();

    const retry = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Повторить загрузку этапов'),
    );
    await act(async () => {
      retry?.click();
      await Promise.resolve();
    });

    expect(mocks.retry).toHaveBeenCalledOnce();
  });
});
