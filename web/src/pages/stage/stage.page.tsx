import { Link, useLocation, useNavigate, useSearch } from '@tanstack/react-router';

import { StageAcceptance } from '@features/stages/acceptance';
import { StageEditor } from '@features/stages/edit';
import { MaterialsOverview, StageMaterials } from '@features/stages/materials';
import { WorkPayments } from '@features/stages/payments';
import { StageOverview } from '@features/stages/view';
import { useAuth } from '@shared/context';
import { Button } from '@shared/ui/button';

import { StageAssigneeWarning } from './ui/stage-assignee-warning';
import { StageTabs } from './ui/stage-tabs';
import { StageWorkingChecklist } from './ui/stage-working-checklist';

export function StagePage({ stageId }: Readonly<{ stageId: string }>) {
  const search = useSearch({ from: '/_auth/stages/$stageId' });
  const navigate = useNavigate({ from: '/stages/$stageId' });
  const hash = useLocation({ select: (location) => location.hash });
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  return (
    <main className="min-w-0 flex-1 bg-background px-3 py-4 sm:px-5 sm:py-5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <StageOverview
          stageId={stageId}
          acceptance={(stage) => <StageAcceptance key={stage.id} stage={stage} />}
          content={(stage) => (
            <StageTabs
              key={stage.id}
              tab={search.tab ?? 'checklist'}
              onTabChange={(tab) => void navigate({ search: (previous) => ({ ...previous, tab }), hash })}
              checklist={<StageWorkingChecklist stage={stage} offset={search.offset} />}
              materials={
                <>
                  <MaterialsOverview stage={stage} />
                  <StageMaterials stage={stage} />
                </>
              }
              work={
                <>
                  <StageAssigneeWarning stage={stage} purpose="work" />
                  <WorkPayments stage={stage} />
                </>
              }
            />
          )}
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
