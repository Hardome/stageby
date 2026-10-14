export function errorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error && 'status' in error && typeof error.status === 'number') return error.status;
}
