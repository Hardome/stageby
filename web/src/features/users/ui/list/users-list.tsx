import { useEffect } from 'react';

import { keepPreviousData } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { PlusIcon, UsersIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';
import { DataRegion } from '@shared/ui/data-region';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@shared/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@shared/ui/field';
import { NotFound } from '@shared/ui/not-found';

import { useListUsers } from '@api/queries/useListUsers';
import { userRoleSchema } from '@api/zod/userRoleSchema';

import { userErrorMessage, useUserAccessError } from '../../lib/use-user-actions';
import { getUsersQuery } from '../../lib/user-search';
import { roleItems } from '../../model/data';
import type { UsersSearch } from '../../model/types';
import { RoleSelect } from '../form/role-select';
import { UserError } from '../user-error';
import { SearchInput } from './search-input';
import { UserResults } from './user-results';
import { UsersListSkeleton } from './users-list-skeleton';

const activityItems = [
  { value: 'all', label: 'Все пользователи' },
  { value: 'active', label: 'Активные' },
  { value: 'inactive', label: 'Неактивные' },
];
const filterRoleItems = [{ value: 'all', label: 'Все роли' }, ...roleItems];

interface UsersListProperties {
  search: UsersSearch;
  onFilterChange: (values: Partial<UsersSearch>) => void;
  onPageChange: (offset: number, shouldReplace?: boolean) => void;
}

export function UsersList({ search, onFilterChange, onPageChange }: Readonly<UsersListProperties>) {
  const query = useListUsers(
    { query: getUsersQuery(search) },
    { query: { retry: false, placeholderData: keepPreviousData } },
  );
  useUserAccessError(query.error);
  const offset = search.offset ?? 0;
  const activity = search.isActive ? 'active' : 'inactive';

  useEffect(() => {
    if (
      !(
        !query.error &&
        !query.isFetching &&
        !query.isPlaceholderData &&
        query.data &&
        offset > 0 &&
        offset >= query.data.total
      )
    ) {
      return;
    }

    const lastOffset = Math.max(0, Math.ceil(query.data.total / 20) - 1) * 20;
    onPageChange(lastOffset, true);
  }, [query.data, query.error, query.isFetching, query.isPlaceholderData, offset, onPageChange]);

  if (query.error?.status === 403 || query.error?.status === 404) return <NotFound />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Пользователи</h1>
          <p className="text-sm text-muted-foreground">Сотрудники, роли и доступ к системе</p>
        </div>
        <Button className="min-h-11" nativeButton={false} render={<Link to="/users/new" search={search} />}>
          <PlusIcon data-icon="inline-start" />
          Создать пользователя
        </Button>
      </div>
      <FieldGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <Field>
          <FieldLabel htmlFor="user-search">Поиск</FieldLabel>
          <SearchInput
            value={search.search ?? ''}
            onChange={(value) => onFilterChange({ search: value || undefined })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="role-filter">Роль</FieldLabel>
          <RoleSelect
            id="role-filter"
            value={search.role ?? 'all'}
            items={filterRoleItems}
            onChange={(value) => onFilterChange({ role: userRoleSchema.safeParse(value).data })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="activity-filter">Активность</FieldLabel>
          <RoleSelect
            id="activity-filter"
            value={search.isActive === undefined ? 'all' : activity}
            items={activityItems}
            onChange={(value) => onFilterChange({ isActive: value === 'all' ? undefined : value === 'active' })}
          />
        </Field>
      </FieldGroup>
      <section aria-label="Список пользователей" aria-busy={query.isFetching} className="flex flex-col gap-4">
        {query.isError && <UserError message={userErrorMessage(query.error)} retry={() => void query.refetch()} />}
        <DataRegion
          initialLabel="Загрузка пользователей"
          isLoading={query.isLoading}
          isFetching={query.isFetching}
          isRefreshing={query.isPlaceholderData && query.isFetching}
          skeleton={<UsersListSkeleton />}
          label="Обновляем список…"
        >
          {query.data && (
            <>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                Найдено: {query.data.total}
              </p>
              {query.data.items.length > 0 ? (
                <UserResults users={query.data.items} search={search} />
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <UsersIcon />
                    </EmptyMedia>
                    <EmptyTitle>Пользователи не найдены</EmptyTitle>
                    <EmptyDescription>Измените фильтры или создайте пользователя.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              <nav aria-label="Страницы пользователей" className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  className="min-h-11"
                  variant="outline"
                  disabled={offset === 0 || query.isFetching}
                  onClick={() => onPageChange(Math.max(0, offset - 20))}
                >
                  Назад
                </Button>
                <span className="text-sm">
                  Страница {Math.floor(offset / 20) + 1} из {Math.max(1, Math.ceil(query.data.total / 20))}
                </span>
                <Button
                  className="min-h-11"
                  variant="outline"
                  disabled={offset + 20 >= query.data.total || query.isFetching}
                  onClick={() => onPageChange(offset + 20)}
                >
                  Далее
                </Button>
              </nav>
            </>
          )}
        </DataRegion>
      </section>
    </div>
  );
}
