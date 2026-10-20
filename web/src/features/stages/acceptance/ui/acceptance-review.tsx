import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@shared/ui/empty';
import { NotFound } from '@shared/ui/not-found';
import { Skeleton } from '@shared/ui/skeleton';
import { Spinner } from '@shared/ui/spinner';

import type { Stage } from '@api/types';

import { useAcceptanceForm } from '../lib/use-acceptance-form';
import { ReworkFields } from './rework-fields';
import { ReworkItems } from './rework-items';

interface AcceptanceReviewProperties {
  stage: Stage;
}

export function AcceptanceReview({ stage }: AcceptanceReviewProperties) {
  const { form, action, checklist, blocked, reworkOpen, setReworkOpen, accept, submit } = useAcceptanceForm(stage);

  if (checklist.error?.status === 403 || checklist.error?.status === 404) return <NotFound />;

  return (
    <div className="flex flex-col gap-4">
      {action.message && (
        <Alert>
          <AlertDescription>{action.message}</AlertDescription>
        </Alert>
      )}
      {action.needsReload && (
        <Button className="self-start" variant="outline" disabled={action.pending} onClick={() => void action.reload()}>
          Обновить данные
        </Button>
      )}
      {checklist.error && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            Не удалось загрузить пункты.
            <Button variant="outline" onClick={() => void checklist.refetch()}>
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <DataRegion
        isLoading={checklist.isLoading}
        isFetching={checklist.isFetching}
        skeleton={<Skeleton className="h-12" />}
      >
        {checklist.data && (
          <>
            {checklist.data.items.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Чек-лист пуст</EmptyTitle>
                  <EmptyDescription>Приёмка недоступна без выполненных пунктов.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="success" disabled={blocked || reworkOpen || stage.assignee === null} onClick={accept}>
                  {action.pending && <Spinner data-icon="inline-start" />}
                  Подтвердить
                </Button>
                <Button variant="outline" disabled={blocked} onClick={() => setReworkOpen(!reworkOpen)}>
                  {reworkOpen ? 'Закрыть замечания' : 'Вернуть на доработку'}
                </Button>
              </div>
            )}
            {reworkOpen && (
              <form
                onSubmit={(event) => {
                  void submit(event);
                }}
              >
                <fieldset disabled={blocked} className="flex min-w-0 flex-col gap-4">
                  <ReworkFields form={form} />
                  <ReworkItems form={form} items={checklist.data.items} />
                  <Button type="submit" className="self-start" disabled={blocked}>
                    {action.pending && <Spinner data-icon="inline-start" />}
                    Отправить замечания
                  </Button>
                </fieldset>
              </form>
            )}
          </>
        )}
      </DataRegion>
    </div>
  );
}
