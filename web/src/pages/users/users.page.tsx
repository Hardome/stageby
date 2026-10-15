import { useCallback } from 'react';

import { useNavigate, useSearch } from '@tanstack/react-router';

import { UsersList, type UsersSearch } from '@features/users';

export function UsersPage() {
  const search = useSearch({ from: '/_auth/users' });
  const navigate = useNavigate();

  const changeFilters = useCallback(
    (values: Partial<UsersSearch>) => {
      void navigate({
        to: '/users',
        search: (previous) => ({ ...previous, ...values, offset: 0 }),
        replace: true,
      });
    },
    [navigate],
  );

  const changePage = useCallback(
    (offset: number, shouldReplace = false) => {
      void navigate({ to: '/users', search: (previous) => ({ ...previous, offset }), replace: shouldReplace });
    },
    [navigate],
  );

  return (
    <main className="flex-1 bg-background px-3 py-4 sm:px-5 sm:py-6">
      <div className="mx-auto max-w-7xl">
        <UsersList search={search} onFilterChange={changeFilters} onPageChange={changePage} />
      </div>
    </main>
  );
}
