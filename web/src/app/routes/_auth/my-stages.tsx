import { createFileRoute } from '@tanstack/react-router';

import { MyStagesPage } from '@pages/my-stages/my-stages.page';

export const Route = createFileRoute('/_auth/my-stages')({
  component: MyStagesPage,
  head: () => ({ meta: [{ title: 'Мои этапы' }] }),
});
