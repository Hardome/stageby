import { Alert, AlertDescription } from '@shared/ui/alert';

export function UnfinishedUploadsWarning() {
  return (
    <Alert>
      <AlertDescription>Завершите загрузку PDF или уберите файлы на шаге «Объект».</AlertDescription>
    </Alert>
  );
}
