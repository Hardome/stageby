import { useEffect } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import { useAuth } from '@shared/context';
import { toast } from '@shared/ui/toast';

import { getCurrentUserQueryKey } from '@api/queries/useGetCurrentUser';
import { getUserQueryKey } from '@api/queries/useGetUser';
import { listUsersQueryKey } from '@api/queries/useListUsers';
import type { User } from '@api/types';

import { userSuccessMessages } from '../model/data';
import type { UserError, UserSuccessAction, UsersSearch } from '../model/types';

const warningStatuses = new Set([400, 401, 409, 429]);

export function userErrorMessage(error: UserError): string {
  switch (error.data?.code) {
    case 'login_taken': {
      return 'Этот логин уже занят. Выберите другой.';
    }
    case 'last_manager': {
      return 'Нельзя деактивировать или сменить роль последнего активного руководителя.';
    }
    case 'user_in_use': {
      return 'Сначала переназначьте незавершённые этапы этого пользователя.';
    }
    default: {
      break;
    }
  }

  if (error.status === 404) return 'Пользователь не найден.';

  if (error.status === 403) return 'Недостаточно прав для управления пользователями.';

  if (error.status === 401) return 'Сессия завершена. Войдите снова.';

  if (error.status === 429) return 'Слишком много запросов. Подождите и повторите попытку.';

  return error.status === 400
    ? (error.data?.message ?? 'Проверьте заполненные поля.')
    : 'Не удалось выполнить запрос. Проверьте соединение и попробуйте ещё раз.';
}

export function useUserAccessError(error: UserError | null) {
  const { clearSession, refetch } = useAuth();

  useEffect(() => {
    if (error?.status === 401) void clearSession();
    if (error?.status === 403) void refetch();
  }, [error, refetch, clearSession]);
}

export function notifyUserError(error: UserError): void {
  toast.add({
    type: warningStatuses.has(error.status ?? 0) ? 'warning' : 'error',
    title: userErrorMessage(error),
    priority: 'high',
  });
}

export function useUserActions(search: UsersSearch) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user: currentUser, clearSession } = useAuth();

  async function finish(action: UserSuccessAction, user?: User, shouldRevokeSession = false) {
    if (shouldRevokeSession) {
      await clearSession();
      await navigate({ to: '/login', replace: true });
      toast.add({
        type: 'success',
        title: userSuccessMessages[action],
        description: 'Войдите снова, чтобы продолжить.',
      });
      return;
    }

    if (user) {
      queryClient.setQueryData(getUserQueryKey({ path: { userId: user.id } }), user);
      if (user.id === currentUser?.id) queryClient.setQueryData(getCurrentUserQueryKey(), user);
    }

    void queryClient.invalidateQueries({ queryKey: listUsersQueryKey() });
    await navigate({ to: '/users', search });
    toast.add({
      type: 'success',
      title: userSuccessMessages[action],
      description: user ? `${user.fullName} (${user.login})` : 'Все сессии пользователя завершены.',
    });
  }

  return { finish, currentUser };
}
