import type { ProjectEdit } from '@api/types';

import { getProjectEditingMocks } from './project-editing-mock-state';

const mocks = getProjectEditingMocks();

vi.mock('@shared/context', () => ({ useAuth: () => ({ user: { id: 1 } }) }));

vi.mock('@api/clients/getProjectEdit', () => ({
  getProjectEdit: () => ({ unwrap: () => mocks.load() as Promise<ProjectEdit> }),
}));
vi.mock('@api/clients/updateProject', () => ({
  updateProject: (options: unknown) => ({ unwrap: () => mocks.update(options) as Promise<unknown> }),
}));
vi.mock('@api/clients/listUsers', () => ({
  listUsers: () => ({ unwrap: () => Promise.resolve({ items: [], total: 0, offset: 0, limit: 20 }) }),
}));
vi.mock('@shared/lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAccessError: () => mocks.access,
}));
vi.mock('@entities/project/lib/upload-document', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  uploadDocument: (...arguments_: unknown[]) => mocks.upload(...arguments_) as Promise<void>,
}));
