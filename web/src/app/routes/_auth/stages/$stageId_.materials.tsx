import { createFileRoute } from '@tanstack/react-router';

import { StageMaterialsPage } from '@pages/stage-materials';
import { myStagesSearchSchema } from '@features/stages/list';

export const Route = createFileRoute('/_auth/stages/$stageId_/materials')({
  component: MaterialsRoute,
  validateSearch: myStagesSearchSchema.loose(),
  head: () => ({ meta: [{ title: 'Материалы и счета' }] }),
});

function MaterialsRoute() {
  const { stageId } = Route.useParams();
  const { offset } = Route.useSearch();
  return <StageMaterialsPage stageId={stageId} offset={offset} />;
}
