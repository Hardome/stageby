import { z } from 'zod';

import { myStagesSearchSchema } from '@features/stages/list';

export const stageTabs = ['checklist', 'materials', 'work'] as const;
export type StageTab = (typeof stageTabs)[number];

export const stageSearchSchema = myStagesSearchSchema.extend({
  tab: z.enum(stageTabs).catch('checklist').optional(),
});
