import { ProjectView } from '@features/view-project';
import { parseProjectId } from '@entities/project';
import { useAuth } from '@shared/context';
import { Alert, AlertDescription } from '@shared/ui/alert';

interface ProjectPageProperties {
  projectId: string;
}

export function ProjectPage({ projectId }: ProjectPageProperties) {
  const { user } = useAuth();
  const id = parseProjectId(projectId);

  let content = (
    <Alert variant="destructive">
      <AlertDescription>Нет доступа к этому объекту.</AlertDescription>
    </Alert>
  );

  if (user?.role === 'manager') {
    content =
      id === undefined ? (
        <Alert variant="destructive">
          <AlertDescription>Некорректная ссылка на объект.</AlertDescription>
        </Alert>
      ) : (
        <ProjectView projectId={id} />
      );
  }
  return (
    <main className="min-w-0 flex-1 bg-background px-3 py-6 sm:px-5 sm:py-10">
      <div className="mx-auto w-full max-w-6xl">{content}</div>
    </main>
  );
}
