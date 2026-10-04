import { asc, inArray } from 'drizzle-orm';

import { projectDocuments } from '#app/db/schema/files';
import type { ProjectRow } from '#app/db/schema/projects';
import { stages } from '#app/db/schema/stages';
import type { Project, ProjectFinancialSummary } from '#app/generated/types.gen';
import { loadStageSummaries } from '#app/modules/materials/summary';
import { toProject } from '#app/modules/projects/mapper';
import type { Database } from '#app/modules/stages/types';

type Db = Database | Parameters<Parameters<Database['transaction']>[0]>[0];
type Summary = Awaited<ReturnType<typeof loadStageSummaries>> extends Map<number, infer T> ? T : never;

export function financialSummary(rows: Summary[]): ProjectFinancialSummary {
  const plan = (field: 'plannedWorkAmountMinor' | 'plannedMaterialAmountMinor') =>
    rows.some((row) => row[field] === null) ? null : rows.reduce((total, row) => total + (row[field] ?? 0), 0);
  const plannedWorkAmountMinor = plan('plannedWorkAmountMinor');
  const plannedMaterialAmountMinor = plan('plannedMaterialAmountMinor');
  const actualWorkAmountMinor = rows.reduce((total, row) => total + row.actualWorkAmountMinor, 0);
  const actualMaterialAmountMinor = rows.reduce((total, row) => total + row.actualMaterialAmountMinor, 0);
  const totalPlannedAmountMinor =
    plannedWorkAmountMinor === null || plannedMaterialAmountMinor === null
      ? null
      : plannedWorkAmountMinor + plannedMaterialAmountMinor;
  const totalActualAmountMinor = actualWorkAmountMinor + actualMaterialAmountMinor;
  return {
    plannedWorkAmountMinor,
    plannedMaterialAmountMinor,
    actualWorkAmountMinor,
    actualMaterialAmountMinor,
    totalPlannedAmountMinor,
    totalActualAmountMinor,
    isPlanComplete: totalPlannedAmountMinor !== null,
    variancePercent:
      totalPlannedAmountMinor === null || totalPlannedAmountMinor === 0
        ? null
        : ((totalPlannedAmountMinor - totalActualAmountMinor) / totalPlannedAmountMinor) * 100,
  };
}

export function projectStatus(included: (typeof stages.$inferSelect)[]): Project['status'] {
  if (included.length > 0 && included.every((stage) => stage.status === 'paid')) return 'completed';
  if (['acceptance', 'completed'].includes(included.at(-1)?.status ?? '')) return 'acceptance';
  if (
    included.some(
      (stage) =>
        stage.actualStartDate !== null ||
        ['in_progress', 'rework', 'acceptance', 'completed', 'paid'].includes(stage.status),
    )
  )
    return 'in_progress';
  return 'created';
}

export async function loadProjects(db: Db, rows: ProjectRow[]): Promise<Project[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const stageRows = await db
    .select()
    .from(stages)
    .where(inArray(stages.projectId, ids))
    .orderBy(asc(stages.position), asc(stages.id));
  const documents = await db
    .select()
    .from(projectDocuments)
    .where(inArray(projectDocuments.projectId, ids))
    .orderBy(asc(projectDocuments.position), asc(projectDocuments.id));
  const summaries = await loadStageSummaries(
    db,
    stageRows.map((stage) => stage.id),
  );
  const stagesByProject = Map.groupBy(stageRows, (stage) => stage.projectId);
  const documentsByProject = Map.groupBy(documents, (document) => document.projectId);
  return rows.map((row) => {
    const included = stagesByProject.get(row.id) ?? [];
    return {
      ...toProject(row),
      status: projectStatus(included),
      finances: financialSummary(included.map((stage) => summaries.get(stage.id)!)),
      documentFileIds: (documentsByProject.get(row.id) ?? []).map((document) => document.fileId),
    };
  });
}
