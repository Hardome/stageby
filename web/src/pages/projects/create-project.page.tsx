import { useCallback, useRef, useState } from 'react';

import { Navigate, useBlocker, useNavigate } from '@tanstack/react-router';

import { ProjectCreator } from '@features/create-project';
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
import { toast } from '@shared/ui/toast';

export function CreateProjectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDirty, setDirty] = useState(false);
  const finished = useRef(false);
  const blocker = useBlocker({
    shouldBlockFn: () => isDirty && !finished.current,
    enableBeforeUnload: () => isDirty && !finished.current,
    withResolver: true,
  });
  const onDirtyChange = useCallback((hasChanges: boolean) => setDirty(hasChanges), []);
  async function finish() {
    finished.current = true;
    await navigate({ to: '/' });
    toast.add({ type: 'success', title: 'Объект создан' });
  }

  if (user?.role !== 'manager') return <Navigate to="/" replace />;

  return (
    <main className="min-w-0 flex-1 bg-background px-3 py-6 sm:px-5 sm:py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="font-bold text-2xl sm:text-3xl">Создание объекта</h1>
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
        <AlertDialogContent className="data-[size=default]:sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить создание?</AlertDialogTitle>
            <AlertDialogDescription>Введённые данные будут потеряны.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:grid sm:grid-cols-2">
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
