import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { PencilLineIcon } from 'lucide-react';

import { canEditChecklistComposition, StageChecklist } from '@entities/stage';
import { useAuth } from '@shared/context';
import { Button } from '@shared/ui/button';

import type { Stage } from '@api/types';

import { StageAssigneeWarning } from './stage-assignee-warning';

interface StageWorkingChecklistProperties {
  stage: Stage;
  offset?: number;
}

export function StageWorkingChecklist({ stage, offset }: Readonly<StageWorkingChecklistProperties>) {
  const { user } = useAuth();
  const stageId = String(stage.id);

  return (
    <>
      <StageAssigneeWarning stage={stage} purpose="checklist" />
      <StageChecklist
        stageId={stage.id}
        editorLink={
          canEditChecklistComposition(stage, user?.role) && (
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  to="/projects/$projectId/edit"
                  params={{ projectId: String(stage.projectId) }}
                  search={{ stageId: stage.id }}
                />
              }
            >
              <PencilLineIcon data-icon="inline-start" />
              Изменить состав
            </Button>
          )
        }
        itemLink={(item) => (
          <Link
            className={cn(
              'flex min-w-0 flex-1 items-start justify-between gap-3 text-base leading-normal font-semibold',
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
