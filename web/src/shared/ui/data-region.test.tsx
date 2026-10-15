// cspell:ignore unstub
import { act, type ComponentProps } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { DataRegion } from './data-region';
import { Skeleton } from './skeleton';

describe('data region presentation', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
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

  async function render(properties: ComponentProps<typeof DataRegion>) {
    await act(async () => {
      root.render(
        <DataRegion skeleton={<Skeleton className="h-5 w-32" />} {...properties}>
          <input aria-label="Сумма" defaultValue="100" />
        </DataRegion>,
      );
      await Promise.resolve();
    });
  }

  it('replaces the initial skeleton with content and exposes one loading status', async () => {
    await render({ isLoading: true, isFetching: true, initialLabel: 'Загрузка сводки' });
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(container.querySelector('[role="status"]')).toHaveAttribute('aria-label', 'Загрузка сводки');
    expect(container.querySelector('input')).toBeNull();
    await render({});
    expect(container.querySelector('input')).not.toBeNull();
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
  });

  it('keeps mounted content and user input through refreshing and background states', async () => {
    await render({});
    const input = container.querySelector('input') as HTMLInputElement;
    input.value = '250';
    input.focus();
    await render({ isFetching: true });
    expect(container.querySelector('input')).toBe(input);
    expect(input).toHaveValue('250');
    expect(input).toHaveFocus();
    expect(container.querySelector('[inert]')).toBeNull();
    await render({ isFetching: true, isRefreshing: true });
    expect(container.querySelector('input')).toBe(input);
    expect(input.closest('[inert]')).not.toBeNull();
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
    await render({});
    expect(container.querySelector('input')).toBe(input);
    expect(input).toHaveValue('250');
    expect(container.querySelector('[inert]')).toBeNull();
  });
});
