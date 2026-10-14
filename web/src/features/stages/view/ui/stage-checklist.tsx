import { useEffect } from 'react';

import { ClipboardCheckIcon, TriangleAlertIcon } from 'lucide-react';

import { useAccessError } from '@shared/lib/hooks';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { NotFound } from '@shared/ui/not-found';
import { Spinner } from '@shared/ui/spinner';

import { useGetStageChecklist } from '@api/queries/useGetStageChecklist';

import { StageChecklistItem } from './stage-checklist-item';

export function StageChecklist({ stageId }: { stageId: number }) {
  const query = useGetStageChecklist({ path: { stageId } }, { query: { retry: false } });
  const accessError = useAccessError();

  useEffect(() => {
    if (query.error) accessError(query.error);
  }, [query.error, accessError]);

  if (query.error?.status === 403 || query.error?.status === 404) return <NotFound />;

  return (
    <Card aria-busy={query.isFetching}>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2">
            <ClipboardCheckIcon className="size-5 text-primary-text" aria-hidden="true" />
            <span>Чек-лист</span>
          </h2>
        </CardTitle>
        <CardDescription>Контрольные точки и готовность работ</CardDescription>
        {query.data && (
          <CardAction>
            <Badge variant="outline">
              {query.data.items.filter((item) => item.isCompleted).length} / {query.data.items.length}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {query.isPending && <Spinner aria-label="Загрузка чек-листа" />}
        {query.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              Не удалось загрузить чек-лист.
              <Button variant="outline" onClick={() => void query.refetch()}>
                Повторить
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          query.data && (
            <>
              {query.isFetching && <p role="status">Обновление чек-листа…</p>}
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
                <p className="text-muted-foreground">Чек-лист пуст.</p>
              ) : (
                <ol className="flex flex-col">
                  {query.data.items.map((item) => (
                    <StageChecklistItem key={item.id} item={item} />
                  ))}
                </ol>
              )}
            </>
          )
        )}
      </CardContent>
    </Card>
  );
}
