import { Link } from '@tanstack/react-router';
import { ArrowUpRightIcon, CalendarDaysIcon, LayersIcon } from 'lucide-react';

import { formatStageDates } from '@entities/project';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

import type { DashboardProjectRow } from '@api/types';

import { DashboardStageSignal } from './dashboard-stage-signal';

interface DashboardProjectCardProperties {
  project: DashboardProjectRow;
  today: string;
}

export function DashboardProjectCard({ project, today }: Readonly<DashboardProjectCardProperties>) {
  const stage = project.selectedStage;

  return (
    <Card className="min-w-0 gap-4">
      <CardHeader className="gap-2">
        <CardTitle>
          <h3>
            <Link
              to="/projects/$projectId"
              params={{ projectId: String(project.projectId) }}
              className="group flex items-start justify-between gap-4 rounded-sm focus-visible:outline-ring"
            >
              <span className="wrap-anywhere underline-offset-4 group-hover:underline">{project.ownerName}</span>
              <ArrowUpRightIcon className="mt-0.5 size-5 shrink-0 text-primary-text" aria-hidden="true" />
            </Link>
          </h3>
        </CardTitle>
        <CardDescription className="leading-relaxed wrap-anywhere">{project.address}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-xl border bg-background p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LayersIcon className="size-4" aria-hidden="true" />
            {stage ? `Текущий этап · ${stage.position} из ${stage.stageCount}` : 'Все этапы выплачены'}
          </div>
          <p className="font-semibold wrap-anywhere">{stage?.title ?? 'Объект завершён'}</p>
          {stage && (
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <CalendarDaysIcon className="size-4 shrink-0" aria-hidden="true" />
              {formatStageDates(stage.plannedStartDate, stage.plannedEndDate)}
            </p>
          )}
          <DashboardStageSignal project={project} kind="status" today={today} />
        </div>
        <dl className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted-foreground">Материалы</dt>
            <dd>
              <DashboardStageSignal project={project} kind="materials" today={today} />
            </dd>
          </div>
          <div className="flex flex-col gap-2 border-t pt-4">
            <dt className="text-xs text-muted-foreground">Мастер</dt>
            <dd>
              <DashboardStageSignal project={project} kind="assignee" today={today} />
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
