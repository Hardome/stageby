import { entityIdSchema } from '@api/zod/entityIdSchema';

export function parseProjectId(value: string): number | undefined {
  if (!/^[1-9]\d*$/.test(value)) return;
  const result = entityIdSchema.safeParse(Number(value));
  return result.success ? result.data : undefined;
}
