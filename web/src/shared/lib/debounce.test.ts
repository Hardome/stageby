import { afterEach, describe, expect, it, vi } from 'vitest';

import { debounce } from './debounce';

describe('debounce', () => {
  afterEach(() => vi.useRealTimers());

  it('calls once with the latest value', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const change = debounce(callback, 300);

    change('first');
    vi.advanceTimersByTime(200);
    change('last');
    vi.advanceTimersByTime(300);

    expect(callback).toHaveBeenCalledExactlyOnceWith('last');
  });

  it('cancels a pending call', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const change = debounce(callback, 300);

    change('query');
    change.cancel();
    vi.runAllTimers();

    expect(callback).not.toHaveBeenCalled();
  });
});
