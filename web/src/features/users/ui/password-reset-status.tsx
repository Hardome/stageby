import { KeyRoundIcon } from 'lucide-react';

import { Badge } from '@shared/ui/badge';

interface PasswordResetStatusProperties {
  requestedAt: string | null;
}

export function PasswordResetStatus({ requestedAt }: PasswordResetStatusProperties) {
  return (
    <>
      {requestedAt && (
        <Badge variant="default">
          <KeyRoundIcon data-icon="inline-start" />
          Запрошен сброс пароля
        </Badge>
      )}
    </>
  );
}
