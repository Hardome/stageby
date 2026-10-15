import { cn } from 'cn';
import { CalendarDaysIcon, PhoneIcon, UserRoundIcon } from 'lucide-react';

import { formatStageDates } from '@entities/project';

import type { Stage } from '@api/types';

interface StageDetailsProperties {
  stage: Stage;
}

export function StageDetails({ stage }: StageDetailsProperties) {
  return (
    <dl className="grid grid-cols-2 gap-3 p-4 md:grid-cols-[1fr_1.3fr_1fr]">
      <div className="flex min-w-0 flex-col gap-2">
        <dt className="text-muted-foreground text-xs">Объект · клиент</dt>
        <dd className="wrap-anywhere font-semibold text-sm">{stage.projectOwnerName}</dd>
        <dd className="text-muted-foreground text-xs">Этап строительства</dd>
      </div>
      <div className="flex min-w-0 flex-col gap-1 md:border-l md:pl-4">
        <dt className="flex items-center gap-2 text-muted-foreground text-xs">
          <CalendarDaysIcon className="size-4" aria-hidden="true" /> Плановые даты
        </dt>
        <dd className="wrap-anywhere font-semibold text-sm">
          {formatStageDates(stage.plannedStartDate, stage.plannedEndDate)}
        </dd>
        <dd className="wrap-anywhere text-muted-foreground text-xs">
          Факт: {formatStageDates(stage.actualStartDate, stage.actualEndDate)}
        </dd>
      </div>
      <div className="col-span-2 flex min-w-0 flex-col gap-1 md:col-span-1 md:border-l md:pl-4">
        <dt className="flex items-center gap-2 text-muted-foreground text-xs">
          <UserRoundIcon className="size-4" aria-hidden="true" /> Ответственный мастер
        </dt>
        <dd className="wrap-anywhere font-semibold text-sm">{stage.assignee?.fullName ?? 'Не назначен'}</dd>
        {stage.assignee?.phone ? (
          <dd>
            <a
              className={cn(
                'flex w-fit items-center gap-2 rounded-sm text-primary-text text-xs',
                'underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring',
              )}
              href={`tel:${stage.assignee.phone}`}
            >
              <PhoneIcon className="size-3" aria-hidden="true" />
              {stage.assignee.phone}
            </a>
          </dd>
        ) : (
          <dd className="text-muted-foreground text-xs">Телефон не указан</dd>
        )}
      </div>
    </dl>
  );
}
