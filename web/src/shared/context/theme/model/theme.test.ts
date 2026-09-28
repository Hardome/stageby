// cspell:ignore unstub
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyTheme, initializeTheme, readTheme, themeStorageKey } from './theme';

describe('theme preference', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  it('uses the system theme when the preference is missing or invalid', () => {
    expect(readTheme()).toBe('system');
    localStorage.setItem(themeStorageKey, 'invalid');
    initializeTheme();
    expect(readTheme()).toBe('system');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('restores the explicit preference instead of the system theme', () => {
    localStorage.setItem(themeStorageKey, 'light');
    initializeTheme();
    expect(readTheme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('follows a light system preference', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    applyTheme('system');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('falls back to the system theme when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage unavailable');
    });
    expect(readTheme()).toBe('system');
    expect(() => initializeTheme()).not.toThrow();
  });
});
