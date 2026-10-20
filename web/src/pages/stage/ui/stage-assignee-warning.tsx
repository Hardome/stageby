import { StageEditor } from '@features/stages/edit';
import { useAuth } from '@shared/context';
import { Alert, AlertDescription } from '@shared/ui/alert';

import type { Stage } from '@api/types';

interface StageAssigneeWarningProperties {
  stage: Stage;
  purpose: 'checklist' | 'work';
}

export function StageAssigneeWarning({ stage, purpose }: StageAssigneeWarningProperties) {
  const { user } = useAuth();
  const isAssigneeRequired = purpose === 'work' ? !stage.assignee?.isActive : stage.assignee === null;
  const shouldShowWarning = isAssigneeRequired && stage.isIncluded && !stage.projectIsArchived;

  const action = 'назначьте мастера';

  return (
    <>
      {shouldShowWarning && (
        <Alert variant="warning">
          <AlertDescription>
            {purpose === 'work' ? 'Чтобы добавить выплату, ' : 'Чтобы завершить пункты чек-листа и принять работы, '}
            {user?.role === 'manager' ? (
              <StageEditor
                stage={stage}
                focusAssignee
                trigger={
                  <button type="button" className="cursor-pointer font-medium underline">
                    {action}
                  </button>
                }
              />
            ) : (
              action
            )}
            .
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
