import { formatStageDates, stageStatuses } from '@entities/project';

import type { Stage } from '@api/types';

interface StageSummaryProperties {
  stage: Stage;
  refreshing: boolean;
}

export function StageSummary({ stage, refreshing }: StageSummaryProperties) {
  return (
    <header className="flex flex-col gap-2" aria-busy={refreshing}>
      <h1 className="font-bold text-2xl">{stage.title}</h1>
      <p>{stage.projectOwnerName}</p>
      <p>{stage.projectAddress}</p>
      <p className="text-muted-foreground text-sm">
        {stageStatuses[stage.status]} · {formatStageDates(stage.plannedStartDate, stage.plannedEndDate)}
      </p>
      {refreshing && (
        <p role="status" className="text-muted-foreground text-sm">
          Обновление этапа…
        </p>
      )}
    </header>
  );
}
