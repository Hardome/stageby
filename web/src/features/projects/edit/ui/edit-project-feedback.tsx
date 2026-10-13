import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';

interface EditProjectFeedbackProperties {
  message: string;
  needsReload: boolean;
  disabled: boolean;
  onReload: () => void;
}

export function EditProjectFeedback({ message, needsReload, disabled, onReload }: EditProjectFeedbackProperties) {
  return (
    <>
      {message && (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {needsReload && (
        <Alert>
          <AlertDescription>
            Данные изменились на сервере. Ваши правки сохранены в форме. Загрузка актуального снимка сбросит их после
            подтверждения.
            <Button type="button" variant="outline" disabled={disabled} onClick={onReload}>
              Загрузить актуальные данные
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
