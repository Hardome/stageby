import { Link } from '@tanstack/react-router';

import { PasswordResetForm } from '@features/auth/password-reset';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';

export function PasswordResetPage() {
  return (
    <main className="flex min-h-dvh items-center bg-background px-3 py-5 sm:px-5 sm:py-8">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="gap-2">
          <CardTitle>
            <h1 className="text-2xl font-bold tracking-tight">Восстановление доступа</h1>
          </CardTitle>
          <CardDescription>Введите логин, чтобы запросить новый пароль у руководителя.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordResetForm />
        </CardContent>
        <CardFooter>
          <Button variant="link" nativeButton={false} render={<Link to="/login" />}>
            Вернуться ко входу
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
