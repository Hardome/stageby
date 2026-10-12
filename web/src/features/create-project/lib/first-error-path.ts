export function firstErrorPath(errors: unknown, prefix = ''): string | undefined {
  if (!errors || typeof errors !== 'object') return;
  if ('type' in errors && typeof errors.type === 'string') return prefix;
  for (const [key, error] of Object.entries(errors)) {
    if (key === 'ref') continue;
    const path = key === 'root' ? prefix : [prefix, key].filter(Boolean).join('.');
    const result = firstErrorPath(error, path);
    if (result !== undefined) return result;
  }
}
