import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';

import type { useMaterialAction } from '../lib/use-material-action';

export function MaterialFeedback({ action }: { action: ReturnType<typeof useMaterialAction> }) {
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
