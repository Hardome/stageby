import { createFileRoute } from '@tanstack/react-router';

import { CreateProjectPage } from '@pages/projects/create-project.page';

export const Route = createFileRoute('/_auth/projects/new')({
  component: CreateProjectPage,
  head: () => ({ meta: [{ title: 'Создание объекта' }] }),
});
