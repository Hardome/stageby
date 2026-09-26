import { Link, useNavigate } from '@tanstack/react-router';
import { LogOutIcon, MenuIcon, UsersIcon } from 'lucide-react';

import { useAuth } from '@shared/context';
import { formatDisplayName } from '@shared/lib';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Avatar, AvatarFallback } from '@shared/ui/avatar';
import { Button } from '@shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import { Spinner } from '@shared/ui/spinner';

import { useLogout } from '@api/mutations/useLogout';
import type { User } from '@api/types';

export function AppHeader() {
  const { user } = useAuth();
  return user ? <HeaderContent user={user} /> : null;
}

function HeaderContent({ user }: { user: User }) {
  const { clearSession } = useAuth();
  const navigate = useNavigate();

  async function finishLogout() {
    await clearSession();
    await navigate({ to: '/login', replace: true });
  }

  const logout = useLogout({
    mutation: {
      onSuccess: finishLogout,
      onError: async (error) => {
        if (error.status === 401) await finishLogout();
      },
    },
  });
  const name = formatDisplayName(user.fullName, user.login);

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-2 px-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:gap-4 sm:px-5">
        <Link to="/" aria-label="Stageby — главная" className="flex-1 font-semibold">
          Stageby
        </Link>
        <nav aria-label="Основная навигация" className="hidden flex-1 justify-center sm:flex">
          {user.role === 'manager' && (
            <Link
              to="/users"
              className="rounded-lg px-3 py-3 text-sm hover:bg-muted focus-visible:outline-ring"
              activeProps={{ className: 'bg-muted font-medium', 'aria-current': 'page' }}
            >
              Пользователи
            </Link>
          )}
        </nav>
        <div className="ml-auto flex min-w-0 items-center justify-end gap-2 sm:flex-1">
          <Avatar aria-label={user.fullName || user.login}>
            <AvatarFallback>{name.initials}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-48 truncate text-sm sm:block" title={user.fullName}>
            {name.label}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label="Меню пользователя"
                  disabled={logout.isPending}
                />
              }
            >
              {logout.isPending ? <Spinner /> : <MenuIcon />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              {user.role === 'manager' && (
                <>
                  <DropdownMenuGroup className="sm:hidden">
                    <DropdownMenuItem
                      className="min-h-11"
                      render={<Link to="/users" activeProps={{ 'aria-current': 'page' }} />}
                    >
                      <UsersIcon />
                      Пользователи
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="sm:hidden" />
                </>
              )}
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="min-h-11"
                  disabled={logout.isPending}
                  onClick={() => logout.mutate(undefined)}
                >
                  <LogOutIcon />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {logout.isError && (
        <Alert variant="destructive">
          <AlertDescription>Не удалось выйти. Повторите попытку через меню пользователя.</AlertDescription>
        </Alert>
      )}
    </header>
  );
}
