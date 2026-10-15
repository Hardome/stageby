import { useEffect } from 'react';

import { useAuth } from '@shared/context';
import { useAccessError } from '@shared/lib/hooks';
import { Button } from '@shared/ui/button';
import { Skeleton } from '@shared/ui/skeleton';

import { useGetUser } from '@api/queries/useGetUser';

export function WorkRecipient({ recipientId }: { recipientId: number | null }) {
  const { user } = useAuth();
  const accessError = useAccessError();
  const query = useGetUser(
    { path: { userId: recipientId ?? 0 } },
    {
      query: { enabled: user?.role === 'manager' && recipientId !== null, retry: false },
    },
  );

  useEffect(() => {
    if (query.error) accessError(query.error);
  }, [query.error, accessError]);

  if (recipientId === null) return <>Не назначен</>;
  if (user?.id === recipientId) return <>{user.fullName}</>;
  if (query.isLoading) return <Skeleton className="h-5 w-32" />;
  if (query.error)
    return (
      <Button variant="ghost" onClick={() => void query.refetch()}>
        Повторить загрузку имени
      </Button>
    );

  if (!query.data) return <>Получатель недоступен</>;

  return (
    <>
      {query.data.fullName}
      {query.data.isActive ? '' : ' (неактивен)'}
    </>
  );
}
