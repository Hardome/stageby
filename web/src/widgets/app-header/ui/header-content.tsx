import { Link, useNavigate } from '@tanstack/react-router';
import { cn } from 'cn';
import { LogOutIcon, MenuIcon, MonitorIcon, MoonIcon, SunIcon, UsersIcon } from 'lucide-react';

import { isTheme, useAuth, useTheme } from '@shared/context';
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
import { ToggleGroup, ToggleGroupItem } from '@shared/ui/toggle-group';

import { useLogout } from '@api/mutations/useLogout';
import type { User } from '@api/types';

interface HeaderContentProperties {
  user: User;
}

export function HeaderContent({ user }: HeaderContentProperties) {
  const { clearSession } = useAuth();
  const { theme, setTheme } = useTheme();
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
    <header className="border-surface-inverse-border border-b bg-surface-inverse text-surface-inverse-foreground">
      <div
        className={cn([
          'mx-auto flex min-h-16 max-w-7xl items-center gap-2 px-3 sm:grid',
          'sm:grid-cols-[1fr_auto_1fr] sm:gap-4 sm:px-5',
        ])}
      >
        <Link to="/" aria-label="Stageby — главная" className="flex-1 font-semibold">
          Stageby
        </Link>
        <nav aria-label="Основная навигация" className="hidden flex-1 justify-center sm:flex">
          {user.role === 'manager' && (
            <Link
              to="/users"
              className="rounded-lg px-3 py-3 text-sm hover:bg-surface-inverse-accent focus-visible:outline-primary"
              activeProps={{ className: 'bg-surface-inverse-accent font-semibold', 'aria-current': 'page' }}
            >
              Пользователи
            </Link>
          )}
        </nav>
        <div className="ml-auto flex min-w-0 items-center justify-end gap-2 sm:flex-1">
          <Avatar aria-label={user.fullName || user.login}>
            <AvatarFallback variant="inverse">{name.initials}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-48 truncate text-sm sm:block" title={user.fullName}>
            {name.label}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="inverse"
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
              <DropdownMenuGroup className="-mx-1 -mt-1">
                <ToggleGroup
                  className="w-full"
                  aria-label="Тема"
                  value={[theme]}
                  spacing={0}
                  square
                  variant="ghost"
                  onValueChange={([value]) => {
                    if (isTheme(value)) setTheme(value);
                  }}
                >
                  <ToggleGroupItem value="light" className="h-11 flex-1" aria-label="Светлая" title="Светлая">
                    <SunIcon />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="dark" className="h-11 flex-1" aria-label="Тёмная" title="Тёмная">
                    <MoonIcon />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="system" className="h-11 flex-1" aria-label="Системная" title="Системная">
                    <MonitorIcon />
                  </ToggleGroupItem>
                </ToggleGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="mt-0" />
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
