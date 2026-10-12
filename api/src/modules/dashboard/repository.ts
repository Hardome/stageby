import { and, asc, count, eq, inArray, sql } from 'drizzle-orm';

import { projects } from '#app/db/schema/projects';
import { stageTypes } from '#app/db/schema/stage-types';
import { stages } from '#app/db/schema/stages';
import { users } from '#app/db/schema/users';
import type { DashboardMoneyMetric, DashboardProjectPage, DashboardSummary } from '#app/generated/types.gen';
import { loadStageSummaries } from '#app/modules/materials/summary';
import { financialSummary, projectStatus } from '#app/modules/projects/read';
import type { Database } from '#app/modules/stages/types';

function metric(plans: (number | null)[], facts: number[]): DashboardMoneyMetric {
  const plannedAmountMinor = plans.some((plan) => plan === null)
    ? null
    : plans.reduce<number>((sum, plan) => sum + (plan ?? 0), 0);
  const actualAmountMinor = facts.reduce((sum, fact) => sum + fact, 0);
  return {
    plannedAmountMinor,
    actualAmountMinor,
    balanceAmountMinor: plannedAmountMinor === null ? null : plannedAmountMinor - actualAmountMinor,
    isPlanComplete: plannedAmountMinor !== null,
  };
}

export class DashboardRepository {
  readonly #database: Database;

  constructor(database: Database) {
    this.#database = database;
  }

  async summary(through: string): Promise<DashboardSummary> {
    // Aggregate payments separately from invoices so neither set multiplies the other.
    // Explicit row deadlines take precedence over the stage end, even when they are later.
    const rows = await this.#database
      .select({
        plannedEndDate: stages.plannedEndDate,
        plannedMaterialAmountMinor: stages.plannedMaterialAmountMinor,
        plannedWorkAmountMinor: sql<number | null>`case
          when ${stages.plannedEndDate} <= ${through} and not exists
            (select 1 from work_plan_rows r where r."stageId" = ${stages.id}) then null
          else (select coalesce(sum(r."amountMinor"), 0) from work_plan_rows r
            where r."stageId" = ${stages.id} and coalesce(r."dueDate", ${stages.plannedEndDate}) <= ${through})
          end`.mapWith(Number),
        actualWorkAmountMinor: sql<number>`(select coalesce(sum(p."amountMinor"), 0)
          from work_payments p join work_plan_rows r on r.id = p."workPlanRowId"
          where r."stageId" = ${stages.id} and coalesce(r."dueDate", ${stages.plannedEndDate}) <= ${through}
            and p."paidAt" <= ${through})`.mapWith(Number),
        actualMaterialAmountMinor: sql<number>`(select coalesce(sum(i."paidAmountMinor"), 0)
          from material_invoices i where i."stageId" = ${stages.id} and i."paidDate" <= ${through})`.mapWith(Number),
      })
      .from(stages)
      .innerJoin(projects, eq(stages.projectId, projects.id))
      .where(and(eq(projects.isArchived, false), eq(stages.isIncluded, true)));
    const materialRows = rows.filter((row) => row.plannedEndDate !== null && row.plannedEndDate <= through);
    const works = metric(
      rows.map((row) => row.plannedWorkAmountMinor),
      rows.map((row) => row.actualWorkAmountMinor),
    );
    const materials = metric(
      materialRows.map((row) => row.plannedMaterialAmountMinor),
      materialRows.map((row) => row.actualMaterialAmountMinor),
    );
    const [active] = await this.#database
      .select({ value: count() })
      .from(projects)
      .where(
        and(
          eq(projects.isArchived, false),
          sql`exists (select 1 from stages s where s."projectId" = projects.id and s."isIncluded" and s.status <> 'paid')`,
        ),
      );
    return {
      through,
      activeProjectCount: active?.value ?? 0,
      works,
      materials,
      total: metric(
        [works.plannedAmountMinor, materials.plannedAmountMinor],
        [works.actualAmountMinor, materials.actualAmountMinor],
      ),
    };
  }

  async list(limit: number, offset: number): Promise<DashboardProjectPage> {
    // Select the page in SQL before loading its stages; NULLS LAST places paid projects last.
    const selectedStart = sql`(select s."plannedStartDate" from stages s where s."projectId" = projects.id and s."isIncluded" and s.status <> 'paid' order by s.position, s.id limit 1)`;
    const rows = await this.#database
      .select()
      .from(projects)
      .where(eq(projects.isArchived, false))
      .orderBy(sql`${selectedStart} asc nulls last`, asc(projects.id))
      .limit(limit)
      .offset(offset);
    const [total] = await this.#database
      .select({ value: count() })
      .from(projects)
      .where(eq(projects.isArchived, false));
    if (rows.length === 0) return { items: [], total: total?.value ?? 0, limit, offset };
    const stageRows = await this.#database
      .select({
        stage: stages,
        title: stageTypes.title,
        assigneeId: users.id,
        assigneeName: users.fullName,
        progressPercent:
          sql<number>`(select coalesce(round(100.0 * count(*) filter (where i."isCompleted") / nullif(count(*), 0)), 0) from checklist_items i join checklists c on c.id = i."checklistId" where c."stageId" = stages.id and i."deletedAt" is null)`.mapWith(
            Number,
          ),
      })
      .from(stages)
      .innerJoin(stageTypes, eq(stages.stageTypeCode, stageTypes.code))
      .leftJoin(users, eq(stages.assigneeId, users.id))
      .where(
        and(
          eq(stages.isIncluded, true),
          inArray(
            stages.projectId,
            rows.map((row) => row.id),
          ),
        ),
      )
      .orderBy(asc(stages.position), asc(stages.id));
    const summaries = await loadStageSummaries(
      this.#database,
      stageRows.map((row) => row.stage.id),
    );
    const byProject = Map.groupBy(stageRows, (row) => row.stage.projectId);
    return {
      items: rows.map((project) => {
        const included = byProject.get(project.id) ?? [];
        const selected = included.find((row) => row.stage.status !== 'paid');
        const summary = selected ? summaries.get(selected.stage.id)! : null;
        return {
          projectId: project.id,
          ownerName: project.ownerName,
          address: project.address,
          status: projectStatus(included.map((row) => row.stage)),
          finances: financialSummary(included.map((row) => summaries.get(row.stage.id)!)),
          selectedStage:
            selected && summary
              ? {
                  stageId: selected.stage.id,
                  position: selected.stage.position,
                  stageCount: included.length,
                  title: selected.title,
                  plannedStartDate: selected.stage.plannedStartDate,
                  plannedEndDate: selected.stage.plannedEndDate,
                  assignee:
                    selected.assigneeId === null ? null : { id: selected.assigneeId, fullName: selected.assigneeName! },
                  status: selected.stage.status,
                  progressPercent: selected.progressPercent,
                  materials: summary.materialSummary,
                  finances: {
                    ...financialSummary([summary]),
                    workBalanceAmountMinor: summary.workBalanceAmountMinor,
                  },
                }
              : null,
        };
      }),
      total: total?.value ?? 0,
      limit,
      offset,
    };
  }
}
