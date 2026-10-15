import { createFileRoute } from '@tanstack/react-router';

import { StageChecklistPage } from '@pages/stage-checklist';
import { myStagesSearchSchema } from '@features/stages/list';

export const Route = createFileRoute('/_auth/stages/$stageId_/checklist_/$itemId/photos')({
  component: ChecklistPhotosRoute,
  validateSearch: myStagesSearchSchema.loose(),
  head: () => ({ meta: [{ title: 'Фото пункта чек-листа' }] }),
});

function ChecklistPhotosRoute() {
  const { stageId, itemId } = Route.useParams();
  const { offset } = Route.useSearch();

  return <StageChecklistPage stageId={stageId} itemId={itemId} offset={offset} />;
}
