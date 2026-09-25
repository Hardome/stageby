import { LoginForm } from '@features/login';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';

export function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center bg-muted/40 px-3 py-8 sm:px-5 sm:py-16">
      <Card className="mx-auto w-full max-w-md shadow-sm">
        <CardHeader className="gap-2">
          <CardTitle>
            <h1 className="font-semibold text-2xl tracking-tight">Вход в Stageby</h1>
          </CardTitle>
          <CardDescription>Введите логин и пароль, чтобы продолжить работу.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="text-muted-foreground text-xs">Stageby</CardFooter>
      </Card>
    </main>
  );
}
