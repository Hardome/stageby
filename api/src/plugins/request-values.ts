// HTTP query/path values arrive as strings. Convert only declared numeric and boolean fields.
export function coerceRequestValues(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value;
  const result = { ...value } as Record<string, unknown>;
  for (const key of ['limit', 'offset', 'projectId', 'stageId', 'assigneeId', 'itemId']) {
    if (typeof result[key] === 'string' && /^\d+$/.test(result[key])) result[key] = Number(result[key]);
  }
  for (const key of ['isArchived', 'includeArchived']) {
    if (result[key] === 'true') result[key] = true;
    else if (result[key] === 'false') result[key] = false;
  }
  return result;
}

export function definedValues<T extends object>(value: T): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as {
    [K in keyof T]: Exclude<T[K], undefined>;
  };
}
