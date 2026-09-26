import { useAuth } from '@shared/context';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Spinner } from '@shared/ui/spinner';

export function AuthStatus() {
  const { error, refetch } = useAuth();

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      {error ? (
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            Не удалось проверить авторизацию.
            <Button variant="outline" onClick={() => void refetch()}>
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Spinner className="size-6" aria-label="Проверка авторизации" />
      )}
    </main>
  );
}
