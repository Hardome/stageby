import { useNavigate } from '@tanstack/react-router';
import { cn } from 'cn';
import { ArrowUpRightIcon } from 'lucide-react';

import { formatMoney, formatStageDates, isStageOverdue, stageStatuses } from '@entities/project';
import { MaterialStatus } from '@entities/stage';
import { Badge } from '@shared/ui/badge';
import { Table, TableBody, TableCell, TableRow } from '@shared/ui/table';

import type { Stage } from '@api/types';

import { ProjectStageTableHead } from './project-stage-table-head';

interface ProjectStageTableProperties {
  stages: Stage[];
  today: string;
}

export function ProjectStageTable({ stages, today }: Readonly<ProjectStageTableProperties>) {
  const navigate = useNavigate();

  return (
    <Table aria-label="Этапы объекта">
      <ProjectStageTableHead />
      <TableBody>
        {stages.map((stage, index) => {
          const isOverdue = isStageOverdue(stage, today);

          return (
            <TableRow
              key={stage.id}
              role="link"
              tabIndex={0}
              aria-label={`Открыть этап: ${stage.title}`}
              className={cn('group cursor-pointer', stage.status === 'in_progress' && 'bg-primary/5')}
              onClick={() => void navigate({ to: '/stages/$stageId', params: { stageId: String(stage.id) } })}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') {
                  return;
                }

                event.preventDefault();
                void navigate({ to: '/stages/$stageId', params: { stageId: String(stage.id) } });
              }}
            >
              <TableCell className="min-w-56 whitespace-normal">
                <div className="font-medium">
                  <span className="mr-2 text-muted-foreground tabular-nums">{index + 1}.</span>
                  {stage.title}
                </div>
                <div className="mt-2 flex max-w-40 flex-col gap-1.5">
                  <span className="text-xs font-medium tabular-nums">{stage.progressPercent}%</span>
                  <progress
                    aria-label={`Готовность этапа ${stage.title}`}
                    max={100}
                    value={stage.progressPercent}
                    className={cn([
                      'h-1.5 w-full appearance-none overflow-hidden rounded-full border-0 bg-background',
                      '[&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-background',
                      '[&::-webkit-progress-value]:bg-primary',
                    ])}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatStageDates(stage.plannedStartDate, stage.plannedEndDate)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant={stage.status === 'completed' || stage.status === 'paid' ? 'success' : 'outline'}>
                    {stageStatuses[stage.status]}
                  </Badge>
                  {isOverdue && <Badge variant="destructive">Просрочен</Badge>}
                </div>
              </TableCell>
              <TableCell className="max-w-48 whitespace-normal">{stage.assignee?.fullName || 'Не назначен'}</TableCell>
              <TableCell className="min-w-44 whitespace-normal">
                <MaterialStatus summary={stage.materialSummary} />
              </TableCell>
              <TableCell className="tabular-nums">
                {formatMoney(stage.plannedWorkAmountMinor)} / {formatMoney(stage.actualWorkAmountMinor)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatMoney(stage.plannedMaterialAmountMinor)} / {formatMoney(stage.actualMaterialAmountMinor)}
              </TableCell>
              <TableCell className="text-primary-text">
                <ArrowUpRightIcon
                  className={cn([
                    'size-4 transition-transform duration-200',
                    'group-hover:translate-x-0.5 group-hover:-translate-y-0.5',
                    'group-focus-visible:translate-x-0.5 group-focus-visible:-translate-y-0.5',
                  ])}
                  aria-hidden="true"
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
