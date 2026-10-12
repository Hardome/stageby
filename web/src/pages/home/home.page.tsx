import { Link } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

import { useAuth } from '@shared/context';
import { Button } from '@shared/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';

export function HomePage() {
  const { user } = useAuth();
  return (
    <main className="flex-1 bg-background px-3 py-8 sm:px-5 sm:py-16">
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>
            <h1 className="font-bold text-2xl">Stageby</h1>
          </CardTitle>
          <CardDescription>Управление строительством</CardDescription>
        </CardHeader>
        <CardFooter>
          {user?.role === 'manager' && (
            <Button render={<Link to="/projects/new" />} nativeButton={false}>
              <PlusIcon data-icon="inline-start" />
              Создать объект
            </Button>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
