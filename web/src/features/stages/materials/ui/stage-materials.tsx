import { useAuth } from '@shared/context';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@shared/ui/empty';
import { NotFound } from '@shared/ui/not-found';

import type { Stage } from '@api/types';

import { materialAccess } from '../lib/material-access';
import { useMaterials } from '../lib/use-materials';
import { InvoiceCard } from './invoice-card';
import { InvoiceCreate } from './invoice-create';
import { MaterialsSkeleton } from './materials-skeleton';

interface StageMaterialsProperties {
  stage: Stage;
}

export function StageMaterials({ stage }: StageMaterialsProperties) {
  const query = useMaterials(stage.id);
  const { user } = useAuth();

  if (query.error?.status === 403 || query.error?.status === 404) {
    return <NotFound />;
  }

  const access = materialAccess(stage, user);
  const limitMessage = 'На этапе может быть не больше 10 счетов. Лимит достигнут.';
  const emptyDescription = access.canManage
    ? 'Нажмите «Добавить счёт», прикрепите файл и укажите сумму. Затем можно отметить оплату и доставку.'
    : 'Руководитель ещё не добавил счета. После добавления здесь можно будет отметить доставку и сообщить о нехватке.';

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label="Счета материалов">
      {query.error && (
        <Alert variant="destructive">
          <AlertDescription>
            Не удалось загрузить счета.{' '}
            <Button variant="outline" onClick={() => void query.refetch()}>
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <DataRegion
        isLoading={!query.data && !query.error}
        isFetching={query.isFetching}
        skeleton={<MaterialsSkeleton />}
        initialLabel="Загрузка счетов"
      >
        {query.data && (
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-col gap-1">
                <h2 className="font-bold text-xl">
                  Счета <span className="text-muted-foreground">{query.data.length} / 10</span>
                </h2>
                <p className="text-muted-foreground text-sm">
                  Оплата и доставка отмечаются отдельно для каждого счёта.
                </p>
              </div>
              {access.canManage && <InvoiceCreate stage={stage} count={query.data.length} />}
            </div>
            {query.data.length >= 10 && access.canManage && (
              <p className="text-muted-foreground text-sm">{limitMessage}</p>
            )}
            {query.data.length === 0 && (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Счетов пока нет</EmptyTitle>
                  <EmptyDescription>{emptyDescription}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
            {query.data.map((invoice, index) => (
              <InvoiceCard key={invoice.id} stage={stage} invoice={invoice} number={index + 1} {...access} />
            ))}
          </div>
        )}
      </DataRegion>
    </section>
  );
}
