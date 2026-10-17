import { useAuth } from '@shared/context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

import type { Stage } from '@api/types';

import { AcceptanceDecision } from './acceptance-decision';
import { AcceptanceReview } from './acceptance-review';

interface StageAcceptanceProperties {
  stage: Stage;
}

export function StageAcceptance({ stage }: StageAcceptanceProperties) {
  const { user } = useAuth();
  const canReview =
    user?.role === 'manager' && stage.status === 'acceptance' && stage.isIncluded && !stage.projectIsArchived;

  return canReview || stage.latestAcceptance || stage.status === 'acceptance' ? (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Приёмка работ</h2>
        </CardTitle>
        <CardDescription>
          {stage.status === 'acceptance' ? 'Работы готовы к проверке руководителем.' : 'Последнее решение руководителя'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {stage.latestAcceptance && (
          <AcceptanceDecision decision={stage.latestAcceptance} isRework={stage.status === 'rework'} />
        )}
        {canReview && <AcceptanceReview key={stage.latestAcceptance?.decidedAt ?? 'first'} stage={stage} />}
      </CardContent>
    </Card>
  ) : null;
}
