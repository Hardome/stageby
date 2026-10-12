import { eq } from 'drizzle-orm';

import { projects } from '#app/db/schema/projects';
import { stages } from '#app/db/schema/stages';
import type { Database } from '#app/modules/stages/types';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/** All stage mutations lock the parent first, then the stage, then its resources. */
export async function lockProjectStage(transaction: Transaction, stageId: number) {
  const [initial] = await transaction
    .select({ projectId: stages.projectId })
    .from(stages)
    .where(eq(stages.id, stageId));
  if (!initial) return;
  const [project] = await transaction.select().from(projects).where(eq(projects.id, initial.projectId)).for('update');
  if (!project) return;
  const [stage] = await transaction.select().from(stages).where(eq(stages.id, stageId)).for('update');
  return stage ? { stage, isArchived: project.isArchived } : undefined;
}
