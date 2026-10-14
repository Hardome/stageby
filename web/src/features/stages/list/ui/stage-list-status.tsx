import { isStageOverdue, stageStatuses } from '@entities/project';
import { Badge } from '@shared/ui/badge';

import type { Stage } from '@api/types';

interface StageListStatusProperties {
  stage: Stage;
  today: string;
}

export function StageListStatus({ stage, today }: StageListStatusProperties) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant={stage.status === 'completed' || stage.status === 'paid' ? 'success' : 'outline'}>
        {stageStatuses[stage.status]}
      </Badge>
      {isStageOverdue(stage, today) && <Badge variant="destructive">Просрочен</Badge>}
    </div>
  );
}
