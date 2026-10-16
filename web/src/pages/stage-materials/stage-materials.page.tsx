import { Link } from '@tanstack/react-router';

import { MaterialsOverview, StageMaterials } from '@features/stages/materials';
import { useStageAccess } from '@entities/stage';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button, buttonVariants } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { NotFound } from '@shared/ui/not-found';
import { Skeleton } from '@shared/ui/skeleton';

export function StageMaterialsPage({ stageId, offset }: { stageId: string; offset?: number }) {
  const { query, invalidId } = useStageAccess(stageId);

  if (invalidId || query.error?.status === 403 || query.error?.status === 404) {
    return <NotFound />;
  }

  return (
    <main className="min-w-0 flex-1 bg-background px-3 py-4 sm:px-5 sm:py-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <Link
          className={buttonVariants({ variant: 'ghost', className: 'self-start' })}
          to="/stages/$stageId"
          params={{ stageId }}
          search={{ offset }}
        >
          ← К этапу
        </Link>
        <h1 className="font-bold text-2xl">Материалы и счета</h1>
        {query.error && (
          <Alert variant="destructive">
            <AlertDescription>
              Не удалось загрузить этап.
              <Button variant="outline" onClick={() => void query.refetch()}>
                Повторить
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <DataRegion
          isLoading={!query.data && !query.error}
          isFetching={query.isFetching}
          skeleton={<Skeleton className="h-40 w-full" />}
          initialLabel="Загрузка этапа"
        >
          {query.data && (
            <div className="flex min-w-0 flex-col gap-4">
              <p className="wrap-anywhere text-muted-foreground">
                {query.data.title} · {query.data.projectAddress}
              </p>
              <MaterialsOverview stage={query.data} />
              <StageMaterials key={query.data.id} stage={query.data} />
            </div>
          )}
        </DataRegion>
      </div>
    </main>
  );
}
