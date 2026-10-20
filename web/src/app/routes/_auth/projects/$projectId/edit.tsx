import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { EditProjectPage } from '@pages/projects/edit-project.page';

export const Route = createFileRoute('/_auth/projects/$projectId/edit')({
  component: EditProjectRoute,
  validateSearch: z.object({ stageId: z.coerce.number().int().positive().optional().catch(undefined) }),
  head: () => ({ meta: [{ title: 'Редактирование объекта' }] }),
});

function EditProjectRoute() {
  const { projectId } = Route.useParams();
  const { stageId } = Route.useSearch();

  return <EditProjectPage projectId={projectId} stageId={stageId} />;
}
