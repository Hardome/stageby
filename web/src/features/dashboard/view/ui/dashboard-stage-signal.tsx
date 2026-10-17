import { Link } from '@tanstack/react-router';
import { cn } from 'cn';

import { projectStatuses, stageStatuses } from '@entities/project';
import { MaterialStatus } from '@entities/stage';
import { Badge } from '@shared/ui/badge';

import type { DashboardProjectRow } from '@api/types';

import { addCalendarDays } from '../lib/dashboard-search';

interface DashboardStageSignalProperties {
  project: DashboardProjectRow;
  kind: 'materials' | 'assignee' | 'status';
  today: string;
}

const destinations = {
  materials: { to: '/stages/$stageId/materials', label: 'Материалы' },
  assignee: { to: '/stages/$stageId', label: 'Мастер' },
  status: { to: '/stages/$stageId/checklist', label: 'Чек-лист' },
} as const;

export function DashboardStageSignal({ project, kind, today }: DashboardStageSignalProperties) {
  const stage = project.selectedStage;

  if (!stage) {
    return kind === 'status' ? <Badge variant="success">{projectStatuses[project.status]}</Badge> : <span>—</span>;
  }

  const needsAssignee =
    kind === 'assignee' &&
    !stage.assignee &&
    stage.plannedStartDate &&
    stage.plannedStartDate <= addCalendarDays(today, 7);
  const destination = destinations[kind];

  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5">
      <Link
        to={destination.to}
        params={{ stageId: String(stage.stageId) }}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'group/signal inline-flex max-w-full items-center rounded-sm underline-offset-4',
          'hover:underline focus-visible:outline-2 focus-visible:outline-ring',
          kind === 'assignee' ? 'text-primary-text' : 'min-h-10',
        )}
        aria-label={`${destination.label} · ${stage.title} (новая вкладка)`}
      >
        {kind === 'materials' && <MaterialStatus summary={stage.materials} />}
        {kind === 'assignee' &&
          (stage.assignee ? (
            <span className="wrap-anywhere font-medium">{stage.assignee.fullName}</span>
          ) : (
            <Badge variant="outline" className="underline-offset-4 group-hover/signal:underline">
              Не назначен
            </Badge>
          ))}
        {kind === 'status' && (
          <Badge
            variant={stage.status === 'acceptance' ? 'caution' : 'outline'}
            className="group-hover/signal:underline"
          >
            {stageStatuses[stage.status]} · {stage.progressPercent}%
          </Badge>
        )}
      </Link>
      {needsAssignee && <Badge variant="warning">До старта ≤ 7 дней</Badge>}
    </div>
  );
}
