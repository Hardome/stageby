import { useState } from 'react';

import { PlusIcon, WalletCardsIcon } from 'lucide-react';

import { useAuth } from '@shared/context';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import { DataRegion } from '@shared/ui/data-region';
import { NotFound } from '@shared/ui/not-found';

import type { Stage } from '@api/types';

import { useWorkPayments } from '../lib/use-work-payments';
import { canEditWork } from '../lib/work-availability';
import type { WorkAction } from '../model/types';
import { WorkEditor } from './work-editor';
import { WorkFinancialOverview } from './work-financial-overview';
import { WorkPaymentList } from './work-payment-list';
import { WorkPaymentsSkeleton } from './work-payments-skeleton';

interface WorkPaymentsProperties {
  stage: Stage;
}

export function WorkPayments({ stage }: WorkPaymentsProperties) {
  const { user } = useAuth();
  const data = useWorkPayments(stage.id);
  const [action, setAction] = useState<WorkAction | null>(null);
  const isManager = user?.role === 'manager';
  const isEditable = canEditWork(stage, user?.role) && !data.error;

  if (data.error?.status === 403 || data.error?.status === 404) return <NotFound />;

  const payments = data.payments.data ?? [];
  const paymentStatus = stage.actualWorkAmountMinor > 0n ? 'Оплачено частично' : 'Не оплачено';

  return (
    <section id="work" className="flex min-w-0 scroll-mt-6 flex-col gap-4" aria-label="Оплата работ">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>
            <h2 className="flex items-center gap-2">
              <WalletCardsIcon className="size-5 text-primary-text" aria-hidden="true" />
              Оплата работ
            </h2>
          </CardTitle>
          <span className="flex max-w-full flex-wrap gap-1.5">
            <Badge variant={stage.status === 'paid' ? 'success' : 'caution'}>
              {stage.status === 'paid' ? 'Выплачен' : paymentStatus}
            </Badge>
          </span>
        </CardHeader>
        <CardContent>
          <WorkFinancialOverview stage={stage} />
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-xl">Выплаты</h2>
        {isManager && data.payments.data && (
          <Button disabled={!isEditable || !stage.assignee?.isActive} onClick={() => setAction({ kind: 'payment' })}>
            <PlusIcon data-icon="inline-start" />
            Добавить выплату
          </Button>
        )}
      </div>
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-4 sm:px-5">
          {data.error && (
            <Alert variant="destructive">
              <AlertDescription>
                Не удалось загрузить оплату работ.
                <Button variant="outline" disabled={data.fetching} onClick={() => void data.reload()}>
                  Повторить
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <DataRegion
            isLoading={data.loading}
            isFetching={data.fetching}
            skeleton={<WorkPaymentsSkeleton />}
            label="Обновляем оплату работ…"
          >
            {data.payments.data && (
              <div className="flex flex-col gap-4">
                {isManager && !stage.assignee?.isActive && (
                  <p className="text-muted-foreground text-sm">Для добавления выплаты назначьте активного мастера.</p>
                )}
                {payments.length === 0 ? (
                  <p className="py-4 text-muted-foreground text-sm">Выплат пока нет.</p>
                ) : (
                  <WorkPaymentList
                    payments={payments}
                    editable={isEditable}
                    showComments={isManager}
                    onAction={setAction}
                  />
                )}
              </div>
            )}
          </DataRegion>
          {action && <WorkEditor stage={stage} action={action} onClose={() => setAction(null)} />}
        </CardContent>
      </Card>
    </section>
  );
}
