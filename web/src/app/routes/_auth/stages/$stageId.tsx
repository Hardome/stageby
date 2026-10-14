import { createFileRoute } from '@tanstack/react-router';

import { StagePage } from '@pages/stage/stage.page';
import { myStagesSearchSchema } from '@features/stages/list';

export const Route = createFileRoute('/_auth/stages/$stageId')({
  component: StageRoute,
  validateSearch: myStagesSearchSchema.loose(),
  head: () => ({ meta: [{ title: 'Этап' }] }),
});

function StageRoute() {
  const { stageId } = Route.useParams();

  return <StagePage stageId={stageId} />;
}
