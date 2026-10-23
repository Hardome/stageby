import { useAuth } from '@shared/context';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { NotFound } from '@shared/ui/not-found';

import type { Stage } from '@api/types';

import { materialAccess } from '../lib/material-access';
import { useMaterials } from '../lib/use-materials';
import { ForemanInvoiceList } from './foreman-invoice-list';
import { ManagerInvoiceList } from './manager-invoice-list';
import { MaterialsSkeleton } from './materials-skeleton';

interface StageMaterialsProperties {
  stage: Stage;
}

export function StageMaterials({ stage }: Readonly<StageMaterialsProperties>) {
  const query = useMaterials(stage.id);
  const { user } = useAuth();

  if (query.error?.status === 403 || query.error?.status === 404) {
    return <NotFound />;
  }

  const access = materialAccess(stage, user);
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
        {query.data &&
          (user?.role === 'manager' ? (
            <ManagerInvoiceList stage={stage} invoices={query.data} canManage={access.canManage} />
          ) : (
            <ForemanInvoiceList stage={stage} invoices={query.data} canReceive={access.canReceive} />
          ))}
      </DataRegion>
    </section>
  );
}
