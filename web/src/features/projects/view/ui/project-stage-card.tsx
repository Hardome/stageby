import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ArrowUpRightIcon, PackageIcon, UserRoundIcon } from 'lucide-react';

import { formatMoney, formatStageDates, isStageOverdue, stageStatuses } from '@entities/project';
import { MaterialStatus } from '@entities/stage';
import { Badge } from '@shared/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';

import type { Stage } from '@api/types';

interface ProjectStageCardProperties {
  stage: Stage;
  number: number;
  today: string;
}

export function ProjectStageCard({ stage, number, today }: ProjectStageCardProperties) {
  const isComplete = stage.status === 'completed' || stage.status === 'paid';

  return (
    <Link
      to="/stages/$stageId"
      params={{ stageId: String(stage.id) }}
      aria-label={`Открыть этап: ${stage.title}`}
      className={cn([
        'group block rounded-xl focus-visible:outline-2 focus-visible:outline-ring',
        'focus-visible:outline-offset-2',
      ])}
    >
      <Card className={cn('min-w-0 gap-4', stage.status === 'in_progress' && 'border-primary/60')}>
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn([
                  'flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background',
                  'font-semibold text-foreground tabular-nums',
                ])}
              >
                {number}
              </span>
              <CardTitle>
                <h3 className="wrap-anywhere">{stage.title}</h3>
              </CardTitle>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <ArrowUpRightIcon
                className={cn([
                  'size-4 text-primary-text transition-transform duration-200',
                  'group-hover:translate-x-0.5 group-hover:-translate-y-0.5',
                  'group-focus-visible:translate-x-0.5 group-focus-visible:-translate-y-0.5',
                ])}
                aria-hidden="true"
              />
              <Badge variant={isComplete ? 'success' : 'outline'}>{stageStatuses[stage.status]}</Badge>
              {isStageOverdue(stage, today) && <Badge variant="destructive">Просрочен</Badge>}
            </div>
          </div>
          <CardDescription className="text-xs">
            {formatStageDates(stage.plannedStartDate, stage.plannedEndDate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`stage-progress-${stage.id}`} className="text-muted-foreground text-xs">
                Готовность
              </label>
              <span className="font-semibold text-sm tabular-nums">{stage.progressPercent}%</span>
            </div>
            <progress
              id={`stage-progress-${stage.id}`}
              max={100}
              value={stage.progressPercent}
              className={cn([
                'h-1.5 w-full appearance-none overflow-hidden rounded-full border-0 bg-background',
                '[&::-webkit-progress-bar]:bg-background',
                isComplete
                  ? '[&::-moz-progress-bar]:bg-success [&::-webkit-progress-value]:bg-success'
                  : '[&::-moz-progress-bar]:bg-primary [&::-webkit-progress-value]:bg-primary',
              ])}
            />
          </div>
          <div className="flex items-center gap-3 border-t pt-4">
            <span
              className={cn([
                'flex size-9 shrink-0 items-center justify-center rounded-full border bg-background',
                'text-muted-foreground',
              ])}
            >
              <UserRoundIcon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Мастер</p>
              <p className="wrap-anywhere font-medium text-sm">{stage.assignee?.fullName || 'Не назначен'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <PackageIcon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <MaterialStatus summary={stage.materialSummary} />
          </div>
        </CardContent>
        <CardFooter className="mt-auto bg-background text-foreground">
          <dl className="grid w-full grid-cols-2 gap-4">
            <div className="min-w-0">
              <dt className="mb-1 font-medium text-muted-foreground text-xs">Работы</dt>
              <dd className="wrap-anywhere font-semibold text-sm tabular-nums">
                Факт: {formatMoney(stage.actualWorkAmountMinor)}
              </dd>
              <dd className="wrap-anywhere mt-1 text-muted-foreground text-xs tabular-nums">
                План: {formatMoney(stage.plannedWorkAmountMinor)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="mb-1 font-medium text-muted-foreground text-xs">Материалы</dt>
              <dd className="wrap-anywhere font-semibold text-sm tabular-nums">
                Факт: {formatMoney(stage.actualMaterialAmountMinor)}
              </dd>
              <dd className="wrap-anywhere mt-1 text-muted-foreground text-xs tabular-nums">
                План: {formatMoney(stage.plannedMaterialAmountMinor)}
              </dd>
            </div>
          </dl>
        </CardFooter>
      </Card>
    </Link>
  );
}
