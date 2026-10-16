import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ArrowUpRightIcon, PencilLineIcon } from 'lucide-react';

import { ChecklistPhotoEditor } from '@features/stages/photos';
import { ChecklistPhotos } from '@features/stages/view';
import {
  canEditChecklistComposition,
  canEditChecklistPhotos,
  StageChecklist,
  StageChecklistSkeleton,
} from '@entities/stage';
import { useAuth } from '@shared/context';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { NotFound } from '@shared/ui/not-found';

import { useChecklistPage } from './lib/use-checklist-page';
import { ChecklistHeading } from './ui/checklist-heading';

interface StageChecklistPageProperties {
  stageId: string;
  itemId?: string;
  offset?: number;
}

export function StageChecklistPage({ stageId, itemId, offset }: StageChecklistPageProperties) {
  const { query, checklist, item, reload, notFound } = useChecklistPage(stageId, itemId);
  const { user } = useAuth();
  if (notFound) return <NotFound />;
  const stage = query.data;

  return (
    <main className="min-w-0 flex-1 bg-background px-3 py-4 sm:px-5 sm:py-5">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <Button
          className="self-start"
          variant="ghost"
          nativeButton={false}
          render={
            itemId === undefined ? (
              <Link to="/stages/$stageId" params={{ stageId }} search={{ offset }} />
            ) : (
              <Link to="/stages/$stageId/checklist" params={{ stageId }} search={{ offset }} />
            )
          }
        >
          {itemId === undefined ? '← Этап' : '← Чек-лист'}
        </Button>
        {(query.error || (itemId !== undefined && checklist.error)) && (
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
          skeleton={<StageChecklistSkeleton />}
          initialLabel="Загрузка этапа"
        >
          {stage && (
            <>
              <ChecklistHeading stage={stage} photos={itemId !== undefined} />
              {itemId === undefined ? (
                <StageChecklist
                  stageId={stage.id}
                  editorLink={
                    canEditChecklistComposition(stage, user?.role) && (
                      <Button
                        className="self-start"
                        variant="outline"
                        nativeButton={false}
                        render={<Link to="/projects/$projectId/edit" params={{ projectId: String(stage.projectId) }} />}
                      >
                        <PencilLineIcon data-icon="inline-start" />
                        Изменить состав
                      </Button>
                    )
                  }
                  itemLink={(entry) => (
                    <Link
                      className={cn(
                        'flex min-w-0 flex-1 items-start justify-between gap-3 font-semibold',
                        'text-base leading-normal outline-none after:absolute after:inset-0',
                        'after:rounded-xl sm:text-base',
                      )}
                      to="/stages/$stageId/checklist/$itemId/photos"
                      params={{ stageId, itemId: String(entry.id) }}
                      search={{ offset }}
                    >
                      <span className="wrap-anywhere">
                        {entry.title}
                        <span className="sr-only"> · Открыть фотографии пункта</span>
                      </span>
                      <ArrowUpRightIcon
                        className={cn(
                          'mt-1 size-4 shrink-0 text-primary-text transition-transform',
                          'group-hover/checkpoint:translate-x-0.5',
                          'group-hover/checkpoint:-translate-y-0.5 motion-reduce:transform-none',
                        )}
                        aria-hidden="true"
                      />
                    </Link>
                  )}
                />
              ) : (
                <DataRegion
                  isLoading={!checklist.data && !checklist.error}
                  isFetching={checklist.isFetching}
                  skeleton={<StageChecklistSkeleton />}
                  initialLabel="Загрузка пункта"
                >
                  {item && (
                    <ChecklistPhotos
                      key={item.id}
                      item={item}
                      canEdit={canEditChecklistPhotos(stage, item, user?.role)}
                    >
                      <ChecklistPhotoEditor
                        stage={stage}
                        item={item}
                        version={checklist.data?.version ?? 0}
                        canEdit={canEditChecklistPhotos(stage, item, user?.role)}
                      />
                    </ChecklistPhotos>
                  )}
                </DataRegion>
              )}
            </>
          )}
        </DataRegion>
      </div>
    </main>
  );
}
