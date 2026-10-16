import { formatDate } from '@entities/project';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';

import type { Acceptance } from '@api/types';

import { formatDecisionDate } from '../lib/format-decision-date';

interface AcceptanceDecisionProperties {
  decision: Acceptance;
  isRework: boolean;
}

export function AcceptanceDecision({ decision, isRework }: AcceptanceDecisionProperties) {
  const decidedAt = formatDecisionDate(decision.decidedAt);

  return (
    <Alert>
      <AlertTitle>{decision.decision === 'accepted' ? 'Этап принят' : 'Замечания по приёмке'}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p className="wrap-anywhere">
          {decision.decidedBy.fullName} · <time dateTime={decision.decidedAt}>{decidedAt}</time> (Екатеринбург)
        </p>
        {decision.comment && <p className="wrap-anywhere whitespace-pre-wrap">{decision.comment}</p>}
        {decision.correctionDueDate && <p>Срок исправления: {formatDate(decision.correctionDueDate)}</p>}
        {isRework && (
          <p>Исправьте отмеченные пункты и добавьте новые фотографии. Остальные пункты доступны для просмотра.</p>
        )}
      </AlertDescription>
    </Alert>
  );
}
