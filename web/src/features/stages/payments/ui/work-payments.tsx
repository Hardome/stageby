import { useState } from 'react';

import { HistoryIcon, WalletCardsIcon } from 'lucide-react';

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
import { WorkEmpty } from './work-empty';
import { WorkFinancialOverview } from './work-financial-overview';
import { WorkPaidAction } from './work-paid-action';
import { WorkPaymentList } from './work-payment-list';
import { WorkPaymentsSkeleton } from './work-payments-skeleton';
import { WorkPlanRow } from './work-plan-row';
import { WorkPlanToolbar } from './work-plan-toolbar';

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

  const rows = data.rows.data ?? [];
  const payments = data.payments.data ?? [];
  const total = rows.reduce((sum, row) => sum + row.amountMinor, 0n);
  const historical = payments.filter((payment) => rows.every((row) => row.id !== payment.workPlanRowId));

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
            ? 'Планирование выплат по получателям и срокам.'
            : 'Строки вашего плана и ваши собственные выплаты. Детализация может быть неполной.'}{' '}
          {isManager && ' Ручной план этапа задаётся отдельно от строк выплат.'}
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
          {data.rows.data && data.payments.data && (
            <div className="flex flex-col gap-4">
              <WorkPlanToolbar
                total={total}
                count={rows.length}
                manager={isManager}
                editable={isEditable}
                onCreate={() => setAction({ kind: 'row' })}
              />
              {rows.length === 0 ? (
                <WorkEmpty manager={isManager} />
              ) : (
                <ul className="flex flex-col gap-4">
                  {rows.map((row) => (
                    <WorkPlanRow
                      key={row.id}
                      row={row}
                      payments={payments.filter((payment) => payment.workPlanRowId === row.id)}
                      manager={isManager}
                      editable={isEditable && !data.error}
                      onAction={setAction}
                    />
                  ))}
                </ul>
              )}
              {historical.length > 0 && (
                <section className="flex flex-col gap-4 rounded-xl border p-4 sm:p-5" aria-label="Исторические выплаты">
                  <h3 className="flex items-center gap-2 font-semibold text-sm">
                    <HistoryIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                    Мои выплаты по недоступным строкам
                  </h3>
                  <WorkPaymentList payments={historical} editable={isEditable} onAction={setAction} />
                </section>
              )}
              {isEditable && (
                <WorkPaidAction
                  stage={stage}
                  disabled={Boolean(data.error)}
                  onConfirm={() => setAction({ kind: 'paid' })}
                />
              )}
            </div>
          )}
        </DataRegion>
        {action && <WorkEditor stage={stage} action={action} onClose={() => setAction(null)} />}
      </CardContent>
    </Card>
  );
}
