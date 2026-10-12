export function stageDatesValid(
  start: string | null | undefined,
  end: string | null | undefined,
  projectStart: string,
  projectEnd: string,
): boolean {
  return (
    (start == null || (start >= projectStart && start <= projectEnd)) &&
    (end == null || (end >= projectStart && end <= projectEnd)) &&
    (start == null || end == null || end >= start)
  );
}
