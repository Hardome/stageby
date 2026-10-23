import { useCallback, useRef, useState } from 'react';

import { useBlocker, useNavigate } from '@tanstack/react-router';
import { PencilRulerIcon } from 'lucide-react';

import { ProjectEditor } from '@features/projects/edit';
import { parseProjectId } from '@entities/project';
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

interface EditProjectPageProperties {
  projectId: string;
  stageId?: number;
}

export function EditProjectPage({ projectId, stageId }: Readonly<EditProjectPageProperties>) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dirty, setDirty] = useState(false);
  const finished = useRef(false);

  const blocker = useBlocker({
    shouldBlockFn: () => Boolean(user) && dirty && !finished.current,
    enableBeforeUnload: () => Boolean(user) && dirty && !finished.current,
    withResolver: true,
  });
  const onDirtyChange = useCallback((isDirty: boolean) => setDirty(isDirty), []);
  const id = parseProjectId(projectId);
  const cancel = () => void navigate({ to: '/projects/$projectId', params: { projectId } });

  async function finish(hasChanges = true) {
    finished.current = true;
    await navigate(
      stageId === undefined
        ? { to: '/projects/$projectId', params: { projectId } }
        : { to: '/stages/$stageId', params: { stageId: String(stageId) } },
    );

    if (hasChanges) toast.add({ type: 'success', title: 'Изменения сохранены' });
  }

  if (id === undefined || user?.role !== 'manager') return <NotFound />;

  return (
    <main className="min-w-0 flex-1 bg-background px-3 py-4 sm:px-5 sm:py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="flex items-center gap-4">
          <span className="hidden size-13 shrink-0 place-items-center rounded-(--radius-card) border bg-card sm:grid">
            <PencilRulerIcon aria-hidden="true" className="size-6 text-primary-text" />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">Редактирование объекта</h1>
          </div>
        </header>
        <ProjectEditor
          key={`${user.id}-${id}`}
          projectId={id}
          initialStageId={stageId}
          onDirtyChange={onDirtyChange}
          onCancel={cancel}
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
