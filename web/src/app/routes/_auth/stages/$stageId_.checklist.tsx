import { createFileRoute } from '@tanstack/react-router';

import { StageChecklistPage } from '@pages/stage-checklist';
import { myStagesSearchSchema } from '@features/stages/list';

export const Route = createFileRoute('/_auth/stages/$stageId_/checklist')({
  component: ChecklistRoute,
  validateSearch: myStagesSearchSchema.loose(),
  head: () => ({ meta: [{ title: 'Рабочий чек-лист' }] }),
});

function ChecklistRoute() {
  const { stageId } = Route.useParams();
  const { offset } = Route.useSearch();

  return <StageChecklistPage stageId={stageId} offset={offset} />;
}
