import { Link, useSearch } from '@tanstack/react-router';

import { StageOverview } from '@features/stages/view';
import { Button } from '@shared/ui/button';

export function StagePage({ stageId }: { stageId: string }) {
  const search = useSearch({ from: '/_auth/stages/$stageId' });

  return (
    <main className="min-w-0 flex-1 bg-background px-3 py-8 sm:px-5 sm:py-16">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <StageOverview
          stageId={stageId}
          backLink={
            <Button
              className="self-start"
              variant="outline"
              nativeButton={false}
              render={<Link to="/my-stages" search={{ offset: search.offset }} />}
            >
              ← Мои этапы
            </Button>
          }
        />
      </div>
    </main>
  );
}
