import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { PencilLineIcon } from 'lucide-react';

import { StageEditor } from '@features/stages/edit';
import { canEditChecklistComposition, StageChecklist } from '@entities/stage';
import { useAuth } from '@shared/context';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';

import type { Stage } from '@api/types';

interface StageWorkingChecklistProperties {
  stage: Stage;
  offset?: number;
}

export function StageWorkingChecklist({ stage, offset }: StageWorkingChecklistProperties) {
  const { user } = useAuth();
  const stageId = String(stage.id);

  return (
    <>
      {stage.assignee === null && stage.isIncluded && !stage.projectIsArchived && (
        <Alert variant="warning">
          <AlertDescription>
            Чтобы завершить пункты чек-листа и принять работы,{' '}
            {user?.role === 'manager' ? (
              <StageEditor
                stage={stage}
                focusAssignee
                trigger={
                  <button type="button" className="cursor-pointer font-medium underline">
                    назначьте мастера
                  </button>
                }
              />
            ) : (
              'назначьте мастера'
            )}
            .
          </AlertDescription>
        </Alert>
      )}
      <StageChecklist
        stageId={stage.id}
        editorLink={
          canEditChecklistComposition(stage, user?.role) && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/projects/$projectId/edit" params={{ projectId: String(stage.projectId) }} />}
            >
              <PencilLineIcon data-icon="inline-start" />
              Изменить состав
            </Button>
          )
        }
        itemLink={(item) => (
          <Link
            className={cn(
              'flex min-w-0 flex-1 items-start justify-between gap-3 font-semibold text-base leading-normal',
              'outline-none after:absolute after:inset-0 after:rounded-xl',
            )}
            to="/stages/$stageId/checklist/$itemId/photos"
            params={{ stageId, itemId: String(item.id) }}
            search={{ offset }}
          >
            <span className="wrap-anywhere">
              {item.title}
              <span className="sr-only"> · Открыть фотографии пункта</span>
            </span>
          </Link>
        )}
      />
    </>
  );
}
