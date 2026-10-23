import { formatDate } from '@entities/project';
import { useAuth } from '@shared/context';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';

import type { Acceptance } from '@api/types';

import { formatDecisionDate } from '../lib/format-decision-date';

interface AcceptanceDecisionProperties {
  decision: Acceptance;
  isRework: boolean;
}

export function AcceptanceDecision({ decision, isRework }: Readonly<AcceptanceDecisionProperties>) {
  const { user } = useAuth();
  const decidedAt = formatDecisionDate(decision.decidedAt);

  return (
    <Alert className="border-0 p-0 lg:border lg:p-4.5">
      <AlertTitle>{decision.decision === 'accepted' ? 'Этап принят' : 'Замечания по приёмке'}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p className="wrap-anywhere">
          {decision.decidedBy.fullName} · <time dateTime={decision.decidedAt}>{decidedAt}</time>
        </p>
        {decision.comment && <p className="wrap-anywhere whitespace-pre-wrap">{decision.comment}</p>}
        {decision.correctionDueDate && <p>Срок исправления: {formatDate(decision.correctionDueDate)}</p>}
        {isRework && user?.role === 'foreman' && (
          <p>
            Исправьте отмеченные пункты и добавьте новые фотографии.
            <br />
            Остальные пункты доступны для просмотра.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
