import { cn } from 'cn';
import { CalendarDaysIcon, PhoneIcon, UserRoundIcon } from 'lucide-react';

import { formatStageDates } from '@entities/project';

import type { Stage } from '@api/types';

interface StageDetailsProperties {
  stage: Stage;
}

export function StageDetails({ stage }: Readonly<StageDetailsProperties>) {
  return (
    <dl className="grid min-h-24 grid-cols-2 gap-3 p-4 md:grid-cols-[1fr_1.3fr_1fr]">
      <div className="flex min-w-0 flex-col gap-2">
        <dt className="text-xs text-muted-foreground">Объект · клиент</dt>
        <dd className="text-sm font-semibold wrap-anywhere">{stage.projectOwnerName}</dd>
      </div>
      <div className="flex min-w-0 flex-col gap-1 md:border-l md:pl-4">
        <dt className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDaysIcon className="size-4" aria-hidden="true" /> Плановые даты
        </dt>
        <dd className="text-sm font-semibold wrap-anywhere">
          {formatStageDates(stage.plannedStartDate, stage.plannedEndDate)}
        </dd>
        <dd className="text-xs wrap-anywhere text-muted-foreground">
          Факт: {formatStageDates(stage.actualStartDate, stage.actualEndDate)}
        </dd>
      </div>
      <div className="col-span-2 flex min-w-0 flex-col gap-1 md:col-span-1 md:border-l md:pl-4">
        <dt className="flex items-center gap-2 text-xs text-muted-foreground">
          <UserRoundIcon className="size-4" aria-hidden="true" /> Мастер
        </dt>
        <dd className="text-sm font-semibold wrap-anywhere">{stage.assignee?.fullName ?? 'Не назначен'}</dd>
        {stage.assignee?.phone ? (
          <dd>
            <a
              className={cn(
                'flex w-fit items-center gap-2 rounded-sm text-xs text-muted-foreground',
                'underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring',
              )}
              href={`tel:${stage.assignee.phone}`}
            >
              <PhoneIcon className="size-3" aria-hidden="true" />
              {stage.assignee.phone}
            </a>
          </dd>
        ) : (
          <dd className="text-xs text-muted-foreground">Телефон не указан</dd>
        )}
      </div>
    </dl>
  );
}
