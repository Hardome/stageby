import { createFileRoute } from '@tanstack/react-router';

import { MyStagesPage } from '@pages/my-stages/my-stages.page';
import { myStagesSearchSchema } from '@features/stages/list';

export const Route = createFileRoute('/_auth/my-stages')({
  component: MyStagesPage,
  validateSearch: myStagesSearchSchema,
  head: () => ({ meta: [{ title: 'Мои этапы' }] }),
});
