// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import type { StageTab } from '../lib/stage-search';
import { StageTabs } from './stage-tabs';

describe('stage tabs', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onTabChange = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    onTabChange.mockClear();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  async function render(tab: StageTab) {
    await act(async () => {
      root.render(
        <StageTabs
          tab={tab}
          onTabChange={onTabChange}
          checklist={<p>Пункты этапа</p>}
          materials={<input aria-label="Поставщик" defaultValue="" />}
          work={<p>Выплаты мастеру</p>}
        />,
      );
      await Promise.resolve();
    });
  }

  it('preserves drafts across tab clicks and URL-driven changes', async () => {
    await render('checklist');

    const tabs = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Чек-лист', 'Материалы', 'Оплата работ']);
    expect(container.querySelector('input')).toBeNull();

    await act(async () => {
      tabs[1]?.click();
      await Promise.resolve();
    });

    expect(onTabChange).toHaveBeenCalledWith('materials');

    await render('materials');

    const input = container.querySelector('input');
    if (!input) throw new Error('Missing input');
    input.value = 'Поставщик 1';

    expect(container.querySelector('[role="tabpanel"][hidden]')).not.toBeNull();

    await render('work');

    expect(input.closest('[role="tabpanel"]')).toHaveAttribute('hidden');

    await render('materials');

    expect(container.querySelector('input')).toBe(input);
    expect(input).toHaveValue('Поставщик 1');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  });
});
