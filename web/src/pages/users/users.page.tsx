import { Link } from '@tanstack/react-router';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

export function UsersPage() {
  return (
    <main className="flex-1 bg-muted/40 px-3 py-8 sm:px-5 sm:py-16">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>
            <h1>Пользователи</h1>
          </CardTitle>
          <CardDescription>Список пользователей появится позже.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/" className="underline underline-offset-4">
            На главную
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
