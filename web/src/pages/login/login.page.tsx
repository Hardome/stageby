import { Link } from '@tanstack/react-router';

import { LoginForm } from '@features/login';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';

export function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center bg-background px-3 py-5 sm:px-5 sm:py-8">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="gap-2">
          <CardTitle>
            <h1 className="font-bold text-2xl tracking-tight">Вход в Stageby</h1>
          </CardTitle>
          <CardDescription>Введите логин и пароль, чтобы продолжить работу.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter>
          <Button variant="link" nativeButton={false} render={<Link to="/password-reset" />}>
            Забыли пароль
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
