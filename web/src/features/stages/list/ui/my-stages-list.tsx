import { Alert, AlertDescription } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@shared/ui/empty';
import { NotFound } from '@shared/ui/not-found';

import { useStagesList } from '../lib/use-stages-list';
import type { MyStagesSearch } from '../model/types';
import { StageListPagination } from './stage-list-pagination';
import { StageListResults } from './stage-list-results';
import { StageListSkeleton } from './stage-list-skeleton';

interface MyStagesListProperties {
  search: MyStagesSearch;
  onPageChange: (offset: number, shouldReplace?: boolean) => void;
}

export function MyStagesList({ search, onPageChange }: Readonly<MyStagesListProperties>) {
  const query = useStagesList(search, onPageChange);

  if (query.error?.status === 403 || query.error?.status === 404) return <NotFound />;

  const offset = search.offset ?? 0;

  return (
    <section aria-label="Мои этапы" aria-busy={query.isFetching} className="flex min-w-0 flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Мои этапы</h1>
        {query.data && (
          <Badge variant="secondary" aria-live="polite">
            Найдено: {query.data.total}
          </Badge>
        )}
      </header>
      {query.isError && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col items-start gap-3">
            Не удалось загрузить этапы.
            <Button variant="outline" disabled={query.isFetching} onClick={() => void query.refetch()}>
              Повторить
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <DataRegion
        initialLabel="Загрузка этапов"
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        isRefreshing={query.isPlaceholderData && query.isFetching}
        skeleton={<StageListSkeleton />}
        label="Обновляем список…"
      >
        {query.data && (
          <>
            {query.data.items.length > 0 ? (
              <StageListResults stages={query.data.items} offset={offset} />
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Вам пока не назначены этапы</EmptyTitle>
                  <EmptyDescription>Назначенные этапы появятся здесь после обновления списка.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
            <StageListPagination
              offset={offset}
              total={query.data.total}
              refreshing={query.isFetching}
              onPageChange={onPageChange}
            />
          </>
        )}
      </DataRegion>
    </section>
  );
}
