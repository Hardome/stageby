import { formatMoney, formatStageDates, todayInYekaterinburg } from '@entities/project';
import { Table, TableBody, TableCell, TableRow } from '@shared/ui/table';

import type { Stage } from '@api/types';

import { StageListActions } from './stage-list-actions';
import { StageListCard } from './stage-list-card';
import { StageListStatus } from './stage-list-status';
import { StageListTableHeader } from './stage-list-table-header';

interface StageListResultsProperties {
  stages: Stage[];
  offset: number;
}

export function StageListResults({ stages, offset }: StageListResultsProperties) {
  const today = todayInYekaterinburg();

  return (
    <>
      <ul className="grid gap-4 md:hidden">
        {stages.map((stage) => (
          <li key={stage.id}>
            <StageListCard stage={stage} offset={offset} today={today} />
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table aria-label="Назначенные этапы">
          <StageListTableHeader />
          <TableBody>
            {stages.map((stage) => (
              <TableRow key={stage.id}>
                <TableCell className="max-w-64 whitespace-normal">
                  <p className="wrap-anywhere font-semibold">{stage.projectOwnerName}</p>
                  <p className="wrap-anywhere text-muted-foreground">{stage.projectAddress}</p>
                </TableCell>
                <TableCell className="max-w-64 whitespace-normal">
                  <p className="font-semibold">{stage.title}</p>
                  <p className="text-muted-foreground">
                    {formatStageDates(stage.plannedStartDate, stage.plannedEndDate)}
                  </p>
                </TableCell>
                <TableCell className="tabular-nums">
                  <p>План: {formatMoney(stage.plannedWorkAmountMinor)}</p>
                  <p>Факт: {formatMoney(stage.actualWorkAmountMinor)}</p>
                </TableCell>
                <TableCell>
                  <StageListStatus stage={stage} today={today} />
                </TableCell>
                <TableCell>
                  <StageListActions stage={stage} offset={offset} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
