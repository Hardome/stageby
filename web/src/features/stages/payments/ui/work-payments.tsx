import { useState } from 'react';

import { WalletCardsIcon } from 'lucide-react';

import { useAuth } from '@shared/context';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
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

  return (
    <Card id="work" className="scroll-mt-6 overflow-hidden">
      <CardHeader className="gap-2 border-b sm:px-5">
        <CardTitle>
          <h2 className="flex items-center gap-3 text-xl">
            <WalletCardsIcon className="size-5 text-primary-text" aria-hidden="true" />
            Оплата работ
          </h2>
        </CardTitle>
        <CardDescription>
          {isManager
            ? 'Фактические выплаты назначенному мастеру этапа.'
            : 'Ваши выплаты за работы. Итоги этапа включают выплаты всем мастерам.'}{' '}
          Статус «Выплачен» определяется автоматически после приёмки.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:px-5">
        <WorkFinancialOverview stage={stage} />
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
              {isManager && (
                <div className="flex flex-col items-start gap-2">
                  <Button
                    disabled={!isEditable || !stage.assignee?.isActive}
                    onClick={() => setAction({ kind: 'payment' })}
                  >
                    Добавить выплату
                  </Button>
                  {!stage.assignee?.isActive && (
                    <p className="text-muted-foreground text-sm">Для добавления выплаты назначьте активного мастера.</p>
                  )}
                </div>
              )}
              {payments.length === 0 ? (
                <p className="py-4 text-muted-foreground text-sm">Выплат пока нет.</p>
              ) : (
                <WorkPaymentList payments={payments} editable={isEditable} onAction={setAction} />
              )}
            </div>
          )}
        </DataRegion>
        {action && <WorkEditor stage={stage} action={action} onClose={() => setAction(null)} />}
      </CardContent>
    </Card>
  );
}
