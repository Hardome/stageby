import { createFileRoute } from '@tanstack/react-router';

import { parseUsersSearch } from '@features/users';

import { UsersLayout } from '../../layouts/users-layout';

export const Route = createFileRoute('/_auth/users')({
  validateSearch: parseUsersSearch,
  component: UsersLayout,
});
