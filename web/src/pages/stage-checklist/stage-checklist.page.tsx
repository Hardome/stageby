import { Link, useNavigate } from '@tanstack/react-router';

import { ChecklistPhotoEditor } from '@features/stages/photos';
import { ChecklistPhotos } from '@features/stages/view';
import { canEditChecklistPhotos } from '@entities/stage';
import { useAuth } from '@shared/context';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { NotFound } from '@shared/ui/not-found';

import { useChecklistPage } from './lib/use-checklist-page';
import { ChecklistHeading } from './ui/checklist-heading';
import { StageChecklistPageSkeleton } from './ui/stage-checklist-page-skeleton';

interface StageChecklistPageProperties {
  stageId: string;
  itemId: string;
  offset?: number;
}

export function StageChecklistPage({ stageId, itemId, offset }: StageChecklistPageProperties) {
  const navigate = useNavigate();
  const { query, checklist, item, reload, notFound } = useChecklistPage(stageId, itemId);
  const { user } = useAuth();
  if (notFound) return <NotFound />;
  const stage = query.data;
  const canEdit = Boolean(stage && item && canEditChecklistPhotos(stage, item, user?.role));

  return (
    <main className="min-w-0 flex-1 bg-background px-3 py-4 sm:px-5 sm:py-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <Button
          className="self-start"
          variant="ghost"
          nativeButton={false}
          render={<Link to="/stages/$stageId" params={{ stageId }} search={{ offset, tab: 'checklist' }} />}
        >
          ← Этап
        </Button>
        {(query.error || checklist.error) && (
          <Alert variant="destructive">
            <AlertDescription>
              Не удалось загрузить данные.
              <Button variant="outline" onClick={reload}>
                Повторить
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <DataRegion
          isLoading={!stage && !query.error}
          isFetching={query.isFetching}
          skeleton={<StageChecklistPageSkeleton />}
          initialLabel="Загрузка этапа"
        >
          {stage && (
            <DataRegion
              isLoading={!checklist.data && !checklist.error}
              isFetching={checklist.isFetching}
              skeleton={<StageChecklistPageSkeleton />}
              initialLabel="Загрузка пункта"
            >
              {item && (
                <>
                  <ChecklistHeading stage={stage} item={item} canEdit={canEdit} />
                  <ChecklistPhotos key={item.id} item={item}>
                    <ChecklistPhotoEditor
                      stage={stage}
                      item={item}
                      version={checklist.data?.version ?? 0}
                      canEdit={canEdit}
                      onComplete={() =>
                        navigate({ to: '/stages/$stageId', params: { stageId }, search: { offset, tab: 'checklist' } })
                      }
                    />
                  </ChecklistPhotos>
                </>
              )}
            </DataRegion>
          )}
        </DataRegion>
      </div>
    </main>
  );
}
