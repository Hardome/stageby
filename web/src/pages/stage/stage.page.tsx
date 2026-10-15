import { Link, useLocation, useSearch } from '@tanstack/react-router';

import { StageEditor } from '@features/stages/edit';
import { WorkPayments } from '@features/stages/payments';
import { StageOverview } from '@features/stages/view';
import { useAuth } from '@shared/context';
import { Button } from '@shared/ui/button';

export function StagePage({ stageId }: { stageId: string }) {
  const search = useSearch({ from: '/_auth/stages/$stageId' });
  const hash = useLocation({ select: (location) => location.hash });
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  return (
    <main className="min-w-0 flex-1 bg-background px-3 py-4 sm:px-5 sm:py-5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <StageOverview
          stageId={stageId}
          checklistLink={(stage) => (
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  to="/stages/$stageId/checklist"
                  params={{ stageId: String(stage.id) }}
                  search={{ offset: search.offset }}
                />
              }
            >
              Открыть рабочий чек-лист
            </Button>
          )}
          payments={(stage) => <WorkPayments key={stage.id} stage={stage} />}
          actions={
            isManager
              ? (stage) => <StageEditor key={stage.id} stage={stage} defaultOpen={hash === 'parameters'} />
              : undefined
          }
          backLink={(stage) => (
            <Button
              className="self-start"
              variant="ghost"
              nativeButton={false}
              render={
                isManager ? (
                  <Link to="/projects/$projectId" params={{ projectId: String(stage.projectId) }} />
                ) : (
                  <Link to="/my-stages" search={{ offset: search.offset }} />
                )
              }
            >
              {isManager ? '← Объект' : '← Мои этапы'}
            </Button>
          )}
        />
      </div>
    </main>
  );
}
