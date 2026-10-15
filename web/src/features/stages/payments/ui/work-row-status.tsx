import { CircleCheckIcon } from 'lucide-react';

import { Badge } from '@shared/ui/badge';

interface WorkRowStatusProperties {
  plan: bigint;
  actual: bigint;
}

export function WorkRowStatus({ plan, actual }: WorkRowStatusProperties) {
  if (actual > plan) return <Badge variant="warning">Переплата</Badge>;
  if (actual === plan && actual > 0n)
    return (
      <Badge variant="success">
        <CircleCheckIcon aria-hidden="true" />
        Оплачено
      </Badge>
    );
  const label = actual > 0n ? 'Частично оплачено' : 'Без выплат';

  return <Badge variant={actual > 0n ? 'caution' : 'secondary'}>{label}</Badge>;
}
