import { type ReactNode, useEffect } from 'react';

import { ClipboardCheckIcon, TriangleAlertIcon } from 'lucide-react';

import { useAccessError } from '@shared/lib/hooks';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { DataRegion } from '@shared/ui/data-region';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@shared/ui/empty';
import { NotFound } from '@shared/ui/not-found';

import { useGetStageChecklist } from '@api/queries/useGetStageChecklist';
import type { ChecklistItem } from '@api/types';

import { ChecklistProgress } from './checklist-progress';
import { StageChecklistItem } from './stage-checklist-item';
import { StageChecklistSkeleton } from './stage-checklist-skeleton';

interface StageChecklistProperties {
  stageId: number;
  itemLink?: (item: ChecklistItem) => ReactNode;
  editorLink?: ReactNode;
}

export function StageChecklist({ stageId, itemLink, editorLink }: StageChecklistProperties) {
  const query = useGetStageChecklist({ path: { stageId } }, { query: { retry: false } });
  const accessError = useAccessError();

  useEffect(() => {
    if (query.error) accessError(query.error);
  }, [query.error, accessError]);

  if (query.error?.status === 403 || query.error?.status === 404) return <NotFound />;

  return (
    <Card id="checklist" className="scroll-mt-6" aria-busy={query.isFetching}>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2">
            <ClipboardCheckIcon className="size-5 text-primary-text" aria-hidden="true" />
            <span>Чек-лист</span>
          </h2>
        </CardTitle>
        <CardDescription>Контрольные точки и фотографии выполненных работ</CardDescription>
        {query.data && (
          <CardAction>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Пунктов: {query.data.items.length}</Badge>
              {editorLink}
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {query.error && (
          <Alert variant="destructive">
            <AlertDescription>
              Не удалось загрузить чек-лист.
              <Button variant="outline" onClick={() => void query.refetch()}>
                Повторить
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <DataRegion
          isLoading={query.isLoading}
          isFetching={query.isFetching}
          skeleton={<StageChecklistSkeleton />}
          label="Обновляем чек-лист…"
        >
          {query.data && (
            <>
              <ChecklistProgress checklist={query.data} />
              {query.data.warnings.map((warning) => (
                <Alert key={warning}>
                  <TriangleAlertIcon className="text-primary-text" aria-hidden="true" />
                  <AlertDescription>
                    {warning === 'predecessor_incomplete'
                      ? 'Предыдущий этап ещё не выполнен. Предупреждение не блокирует работу.'
                      : 'Работы начаты до полной комплектации материалами.'}
                  </AlertDescription>
                </Alert>
              ))}
              {query.data.items.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>Чек-лист пуст</EmptyTitle>
                    <EmptyDescription>Для передачи на приёмку нужен хотя бы один выполненный пункт.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ol className="flex flex-col gap-3">
                  {query.data.items
                    .toSorted((left, right) => left.position - right.position)
                    .map((item) => (
                      <StageChecklistItem key={item.id} item={item} action={itemLink?.(item)} />
                    ))}
                </ol>
              )}
            </>
          )}
        </DataRegion>
      </CardContent>
    </Card>
  );
}
