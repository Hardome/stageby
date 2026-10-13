import type { ComponentProps } from 'react';

import { useFormState } from 'react-hook-form';

import { getProjectCreationMocks } from './project-creation-mock-state';

const mocks = getProjectCreationMocks();

vi.mock('@entities/project/lib/upload-document', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  uploadDocument: (...arguments_: unknown[]) => mocks.upload(...arguments_) as Promise<void>,
}));
vi.mock('@api/clients/createProject', () => ({
  createProject: (...arguments_: unknown[]) => ({ unwrap: () => mocks.create(...arguments_) as Promise<unknown> }),
}));
vi.mock('@api/clients/listUsers', () => ({
  listUsers: () => ({ unwrap: () => Promise.resolve({ items: [], total: 0, offset: 0, limit: 20 }) }),
}));
vi.mock('@shared/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAccessError: () => mocks.accessError,
}));
vi.mock('@features/projects/create/ui/project-actions', async (importOriginal) => {
  const { ProjectActions } = await importOriginal<typeof import('@features/projects/create/ui/project-actions')>();

  return {
    ProjectActions: (properties: ComponentProps<typeof ProjectActions>) => {
      const { isSubmitting } = useFormState();

      return (
        <div data-form-submitting={isSubmitting}>
          <ProjectActions {...properties} />
        </div>
      );
    },
  };
});
