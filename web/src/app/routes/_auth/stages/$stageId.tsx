import { createFileRoute } from '@tanstack/react-router';

import { StagePage } from '@pages/stage/stage.page';

export const Route = createFileRoute('/_auth/stages/$stageId')({
  component: StageRoute,
  head: () => ({ meta: [{ title: 'Этап' }] }),
});

function StageRoute() {
  const { stageId } = Route.useParams();

  return <StagePage stageId={stageId} />;
}
