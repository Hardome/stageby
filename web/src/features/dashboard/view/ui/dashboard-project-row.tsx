import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ArrowUpRightIcon } from 'lucide-react';

import { formatStageDates } from '@entities/project';
import { TableCell, TableRow } from '@shared/ui/table';

import type { DashboardProjectRow as ProjectRow } from '@api/types';

import { DashboardStageSignal } from './dashboard-stage-signal';

interface DashboardProjectRowProperties {
  project: ProjectRow;
  today: string;
}

export function DashboardProjectRow({ project, today }: Readonly<DashboardProjectRowProperties>) {
  const stage = project.selectedStage;

  return (
    <TableRow>
      <TableCell className="max-w-72 whitespace-normal">
        <Link
          to="/projects/$projectId"
          params={{ projectId: String(project.projectId) }}
          className={cn(
            'group flex min-h-12 items-start gap-3 rounded-sm',
            'focus-visible:outline-2 focus-visible:outline-ring',
          )}
        >
          <span className="flex min-w-0 flex-col gap-1.5">
            <span className="font-semibold wrap-anywhere underline-offset-4 group-hover:underline">
              {project.ownerName}
            </span>
            <span className="text-xs leading-relaxed wrap-anywhere text-muted-foreground">{project.address}</span>
          </span>
          <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-primary-text" aria-hidden="true" />
        </Link>
      </TableCell>
      <TableCell className="max-w-64 whitespace-normal">
        {stage ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Этап {stage.position} из {stage.stageCount}
            </span>
            <span className="font-semibold">{stage.title}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              {formatStageDates(stage.plannedStartDate, stage.plannedEndDate)}
            </span>
          </div>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className="max-w-64 whitespace-normal">
        <DashboardStageSignal project={project} kind="materials" today={today} />
      </TableCell>
      <TableCell className="max-w-56 whitespace-normal">
        <DashboardStageSignal project={project} kind="assignee" today={today} />
      </TableCell>
      <TableCell>
        <DashboardStageSignal project={project} kind="status" today={today} />
      </TableCell>
    </TableRow>
  );
}
