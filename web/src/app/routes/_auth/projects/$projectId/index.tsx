import { createFileRoute } from '@tanstack/react-router';

import { ProjectPage } from '@pages/projects/project.page';

export const Route = createFileRoute('/_auth/projects/$projectId/')({
  component: ProjectRoute,
  head: () => ({ meta: [{ title: 'Объект — Stageby' }] }),
});

function ProjectRoute() {
  const { projectId } = Route.useParams();
  return <ProjectPage projectId={projectId} />;
}
