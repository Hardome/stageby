import { type PropsWithChildren, useEffect, useState } from 'react';

import { ThemeContext } from '../model/context';
import { applyTheme, readTheme, type Theme, themeStorageKey } from '../model/theme';

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState(readTheme);

  function setTheme(value: Theme) {
    setThemeState(value);
    try {
      localStorage.setItem(themeStorageKey, value);
    } catch {
      // Keep the selected theme for this session when storage is unavailable.
    }
  }

  useEffect(() => {
    applyTheme(theme);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemThemeChange = () => {
      if (theme === 'system') applyTheme(theme);
    };
    media.addEventListener('change', onSystemThemeChange);
    return () => media.removeEventListener('change', onSystemThemeChange);
  }, [theme]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === themeStorageKey || event.key === null)) {
        setThemeState(readTheme());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>;
}
