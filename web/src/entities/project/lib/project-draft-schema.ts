import { z } from 'zod';

import { stageTypeSchema } from '@api/zod/stageTypeSchema';

const checklistDraftSchema = z.object({ title: z.string(), photoHint: z.string() });
const stageDraftSchema = z.object({
  type: stageTypeSchema,
  title: z.string(),
  enabled: z.boolean(),
  plannedStartDate: z.string(),
  plannedEndDate: z.string(),
  assigneeId: z.number().int().positive().nullable(),
  assigneeName: z.string(),
  plannedWorkAmount: z.string(),
  plannedMaterialAmount: z.string(),
  checklistItems: z.array(checklistDraftSchema),
});

export const projectDraftSchema = z.object({
  ownerName: z.string(),
  address: z.string(),
  coordinates: z.string(),
  plannedStartDate: z.string(),
  plannedEndDate: z.string(),
  stages: z.array(stageDraftSchema),
});
