import type { z } from 'zod';

import type { projectSearchSchema } from '../lib/project-search';

export type ProjectsSearch = z.infer<typeof projectSearchSchema>;
