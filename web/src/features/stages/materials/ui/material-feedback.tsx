import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';

import type { useMaterialAction } from '../lib/use-material-action';

interface MaterialFeedbackProperties {
  action: ReturnType<typeof useMaterialAction>;
}

export function MaterialFeedback({ action }: MaterialFeedbackProperties) {
  return (
    <>
      {action.message && (
        <Alert>
          <AlertDescription className="flex flex-col items-start gap-2">
            {action.message}
            {action.needsReload && (
              <Button variant="outline" disabled={action.pending} onClick={() => void action.reload()}>
                Обновить данные
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
