import { Link } from '@tanstack/react-router';
import { PlusIcon } from 'lucide-react';

import { type ProjectsSearch, TemporaryProjectList } from '@features/projects/list';
import { useAuth } from '@shared/context';
import { Button } from '@shared/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';

interface HomePageProperties {
  search: ProjectsSearch;
  onPageChange: (offset: number, shouldReplace?: boolean) => void;
}

export function HomePage({ search, onPageChange }: HomePageProperties) {
  const { user } = useAuth();
  return (
    <main className="flex-1 bg-background px-3 py-8 sm:px-5 sm:py-16">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Card>
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
        {user?.role === 'manager' && <TemporaryProjectList search={search} onPageChange={onPageChange} />}
      </div>
    </main>
  );
}
