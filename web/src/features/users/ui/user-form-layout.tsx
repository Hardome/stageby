import type { PropsWithChildren } from 'react';

import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

import type { UsersSearch } from '../model/types';

interface UserFormLayoutProperties extends PropsWithChildren {
  title: string;
  description: string;
  search: UsersSearch;
}

export function UserFormLayout({ title, description, search, children }: UserFormLayoutProperties) {
  return (
    <main className="flex-1 bg-background px-3 py-6 sm:px-5 sm:py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Button
          className="min-h-11 self-start"
          variant="ghost"
          nativeButton={false}
          render={<Link to="/users" search={search} />}
        >
          <ArrowLeftIcon data-icon="inline-start" />К списку пользователей
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>
              <h1 className="font-bold text-2xl">{title}</h1>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}
