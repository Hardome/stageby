import { useCallback, useRef, useState } from 'react';

import { useBlocker, useNavigate } from '@tanstack/react-router';
import { HousePlusIcon } from 'lucide-react';

import { ProjectCreator } from '@features/projects/create';
import { useAuth } from '@shared/context';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shared/ui/alert-dialog';
import { Button } from '@shared/ui/button';
import { NotFound } from '@shared/ui/not-found';
import { toast } from '@shared/ui/toast';

export function CreateProjectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDirty, setDirty] = useState(false);
  const finished = useRef(false);
  const blocker = useBlocker({
    shouldBlockFn: () => Boolean(user) && isDirty && !finished.current,
    enableBeforeUnload: () => Boolean(user) && isDirty && !finished.current,
    withResolver: true,
  });
  const onDirtyChange = useCallback((hasChanges: boolean) => setDirty(hasChanges), []);
  async function finish() {
    finished.current = true;
    await navigate({ to: '/' });
    toast.add({ type: 'success', title: 'Объект создан' });
  }

  if (user?.role !== 'manager') return <NotFound />;

  return (
    <main className="min-w-0 flex-1 bg-background px-3 py-4 sm:px-5 sm:py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex items-start gap-4">
          <span className="hidden size-13 shrink-0 place-items-center rounded-(--radius-card) border bg-card sm:grid">
            <HousePlusIcon aria-hidden="true" className="size-6 text-primary-text" />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="font-bold text-2xl sm:text-3xl">Создание объекта</h1>
            <p className="text-muted-foreground text-sm">От адреса и документов до плана строительных работ.</p>
          </div>
        </header>
        <ProjectCreator
          key={user.id}
          onDirtyChange={onDirtyChange}
          onCancel={() => void navigate({ to: '/' })}
          onSuccess={finish}
        />
      </div>
      <AlertDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить создание?</AlertDialogTitle>
            <AlertDialogDescription>Введённые данные будут потеряны.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Продолжить создание
            </Button>
            <Button variant="destructive" onClick={() => blocker.proceed?.()}>
              Отменить создание
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
