import { createFileRoute } from '@tanstack/react-router';

import { EditProjectPage } from '@pages/projects/edit-project.page';

export const Route = createFileRoute('/_auth/projects/$projectId/edit')({
  component: EditProjectRoute,
  head: () => ({ meta: [{ title: 'Редактирование объекта' }] }),
});

function EditProjectRoute() {
  const { projectId } = Route.useParams();
  return <EditProjectPage projectId={projectId} />;
}
