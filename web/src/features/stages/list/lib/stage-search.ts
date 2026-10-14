import { z } from 'zod';

import { stagePageSize } from '../model/data';
import type { MyStagesSearch } from '../model/types';

export const myStagesSearchSchema = z.object({
  offset: z.number().int().min(0).max(2147483647).catch(0).optional(),
});

export function getStagesQuery(search: MyStagesSearch) {
  return { limit: stagePageSize, offset: search.offset ?? 0 };
}
