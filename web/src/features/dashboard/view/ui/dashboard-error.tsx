import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';

interface DashboardErrorProperties {
  message: string;
  pending: boolean;
  onRetry: () => void;
}

export function DashboardError({ message, pending, onRetry }: DashboardErrorProperties) {
  return (
    <Alert variant="destructive">
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        {message}
        <Button variant="outline" disabled={pending} onClick={onRetry}>
          Повторить
        </Button>
      </AlertDescription>
    </Alert>
  );
}
