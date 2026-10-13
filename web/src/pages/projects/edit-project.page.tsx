import { type ReactNode, useCallback, useRef, useState } from 'react';

import { useBlocker, useNavigate } from '@tanstack/react-router';

import { ProjectEditor } from '@features/edit-project';
import { parseProjectId } from '@entities/project';
import { useAuth } from '@shared/context';
import { Alert, AlertDescription } from '@shared/ui/alert';
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

export function EditProjectPage({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dirty, setDirty] = useState(false);
  const finished = useRef(false);
  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !finished.current,
    enableBeforeUnload: () => dirty && !finished.current,
    withResolver: true,
  });
  const onDirtyChange = useCallback((isDirty: boolean) => setDirty(isDirty), []);
  const id = parseProjectId(projectId);
  const cancel = () => void navigate({ to: '/projects/$projectId', params: { projectId } });
  async function finish(hasChanges = true) {
    finished.current = true;
    await navigate({ to: '/projects/$projectId', params: { projectId } });
    if (hasChanges) toast.add({ type: 'success', title: 'Изменения сохранены' });
  }
  let content: ReactNode;
  if (user?.role !== 'manager')
    content = (
      <Alert variant="destructive">
        <AlertDescription>Нет доступа к редактированию объекта.</AlertDescription>
      </Alert>
    );
  else if (id === undefined)
    content = (
      <Alert variant="destructive">
        <AlertDescription>Некорректная ссылка на объект.</AlertDescription>
      </Alert>
    );
  else
    content = (
      <ProjectEditor
        key={`${user.id}-${id}`}
        projectId={id}
        onDirtyChange={onDirtyChange}
        onCancel={cancel}
        onSuccess={finish}
      />
    );
  return (
    <main className="min-w-0 flex-1 bg-background px-3 py-6 sm:px-5 sm:py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <h1 className="font-bold text-2xl sm:text-3xl">Редактирование объекта</h1>
        {content}
      </div>
      <AlertDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить редактирование?</AlertDialogTitle>
            <AlertDialogDescription>Несохранённые изменения будут потеряны.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Продолжить редактирование
            </Button>
            <Button variant="destructive" onClick={() => blocker.proceed?.()}>
              Отменить редактирование
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
