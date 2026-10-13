import { z } from 'zod';

import { projectPageSize } from '../model/data';
import type { ProjectsSearch } from '../model/types';

export const projectSearchSchema = z.object({
  offset: z.number().int().min(0).max(2147483647).catch(0).optional(),
});

export function getProjectsQuery(search: ProjectsSearch) {
  return { limit: projectPageSize, offset: search.offset ?? 0 };
}
