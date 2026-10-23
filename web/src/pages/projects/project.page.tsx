import { useNavigate } from '@tanstack/react-router';

import { ProjectView } from '@features/projects/view';
import { parseProjectId } from '@entities/project';
import { useAuth } from '@shared/context';
import { NotFound } from '@shared/ui/not-found';

interface ProjectPageProperties {
  projectId: string;
}

export function ProjectPage({ projectId }: Readonly<ProjectPageProperties>) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const id = parseProjectId(projectId);

  let content = <NotFound />;

  if (user?.role === 'manager') {
    content =
      id === undefined ? (
        <NotFound />
      ) : (
        <ProjectView
          projectId={id}
          onEdit={() =>
            void navigate({
              to: '/projects/$projectId/edit',
              params: { projectId },
            })
          }
        />
      );
  }

  return (
    <main className="min-w-0 flex-1 bg-background px-3 py-4 sm:px-5 sm:py-5">
      <div className="mx-auto w-full max-w-6xl">{content}</div>
    </main>
  );
}
