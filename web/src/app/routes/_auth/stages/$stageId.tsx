import { createFileRoute } from '@tanstack/react-router';

import { StagePage, stageSearchSchema } from '@pages/stage';

export const Route = createFileRoute('/_auth/stages/$stageId')({
  component: StageRoute,
  validateSearch: stageSearchSchema,
  head: () => ({ meta: [{ title: 'Этап' }] }),
});

function StageRoute() {
  const { stageId } = Route.useParams();

  return <StagePage stageId={stageId} />;
}
