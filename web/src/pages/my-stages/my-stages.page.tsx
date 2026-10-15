import { useCallback } from 'react';

import { useNavigate, useSearch } from '@tanstack/react-router';

import { MyStagesList } from '@features/stages/list';

export function MyStagesPage() {
  const search = useSearch({ from: '/_auth/my-stages' });
  const navigate = useNavigate();

  const changePage = useCallback(
    (offset: number, shouldReplace = false) => {
      void navigate({ to: '/my-stages', search: { offset }, replace: shouldReplace });
    },
    [navigate],
  );

  return (
    <main className="min-w-0 flex-1 bg-background px-3 py-4 sm:px-5 sm:py-6">
      <div className="mx-auto max-w-7xl">
        <MyStagesList search={search} onPageChange={changePage} />
      </div>
    </main>
  );
}
