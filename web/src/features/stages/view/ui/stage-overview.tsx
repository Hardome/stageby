import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { NotFound } from '@shared/ui/not-found';
import { Spinner } from '@shared/ui/spinner';

import { useStageAccess } from '../lib/use-stage-access';
import { StageSummary } from './stage-summary';

export function StageOverview({ stageId }: { stageId: string }) {
  const { query, invalidId } = useStageAccess(stageId);

  if (invalidId || query.error?.status === 403 || query.error?.status === 404) {
    return <NotFound />;
  }

  if (query.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-col items-start gap-3">
          Не удалось загрузить этап.
          <Button variant="outline" onClick={() => void query.refetch()}>
            Повторить
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return query.isPending ? (
    <Spinner aria-label="Загрузка этапа" />
  ) : (
    <StageSummary stage={query.data} refreshing={query.isFetching} />
  );
}
