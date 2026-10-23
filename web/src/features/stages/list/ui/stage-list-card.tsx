import { formatMoney, formatStageDates } from '@entities/project';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';

import type { Stage } from '@api/types';

import { StageListActions } from './stage-list-actions';
import { StageListStatus } from './stage-list-status';

interface StageListCardProperties {
  stage: Stage;
  offset: number;
  today: string;
}

export function StageListCard({ stage, offset, today }: Readonly<StageListCardProperties>) {
  return (
    <Card className="min-w-0 gap-4">
      <CardHeader>
        <CardTitle>
          <h2 className="wrap-anywhere">{stage.title}</h2>
        </CardTitle>
        <CardDescription className="wrap-anywhere">
          {stage.projectOwnerName} · {stage.projectAddress}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <StageListStatus stage={stage} today={today} />
        <p className="text-sm text-muted-foreground">
          {formatStageDates(stage.plannedStartDate, stage.plannedEndDate)}
        </p>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div className="min-w-0">
            <dt className="text-muted-foreground">План работ</dt>
            <dd className="font-semibold wrap-anywhere tabular-nums">{formatMoney(stage.plannedWorkAmountMinor)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Факт работ</dt>
            <dd className="font-semibold wrap-anywhere tabular-nums">{formatMoney(stage.actualWorkAmountMinor)}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter>
        <StageListActions stage={stage} offset={offset} />
      </CardFooter>
    </Card>
  );
}
