import type { User } from '@api/types';

export function roleHome(role: User['role']): '/' | '/my-stages' {
  return role === 'foreman' ? '/my-stages' : '/';
}

function hasUnsafeCharacters(value: string): boolean {
  return (
    /[\\\s]/.test(value) ||
    [...value].some((character) => (character.codePointAt(0) ?? 0) < 32 || character.codePointAt(0) === 127)
  );
}

export function safeReturnTo(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || hasUnsafeCharacters(value))
    return;
  try {
    const decoded = decodeURIComponent(value.split(/[?#]/, 1)[0] ?? '');
    if (decoded.startsWith('//') || hasUnsafeCharacters(decoded)) return;
    const url = new URL(value, 'https://stageby.invalid');
    if (url.origin !== 'https://stageby.invalid' || /^\/login\/?$/.test(url.pathname)) return;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return;
  }
}

export function loginSearch(search: Record<string, unknown>): { returnTo?: string } {
  return { returnTo: safeReturnTo(search.returnTo) };
}
