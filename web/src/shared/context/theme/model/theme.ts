export type Theme = 'light' | 'dark' | 'system';

export const themeStorageKey = 'stageby.theme';

const themes = new Set<string>(['light', 'dark', 'system']);

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && themes.has(value);
}

export function readTheme(): Theme {
  try {
    const storedTheme = localStorage.getItem(themeStorageKey);

    return isTheme(storedTheme) ? storedTheme : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(theme: Theme) {
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
}

export function initializeTheme() {
  applyTheme(readTheme());
}
