import { useEffect } from 'react';

import { Link } from '@tanstack/react-router';
import { PlusIcon, UsersIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@shared/ui/empty';
import { Field, FieldGroup, FieldLabel } from '@shared/ui/field';

import { useListUsers } from '@api/queries/useListUsers';
import { userRoleSchema } from '@api/zod/userRoleSchema';

import { userErrorMessage, useUserAccessError } from '../../lib/use-user-actions';
import { getUsersQuery } from '../../lib/user-search';
import { roleItems } from '../../model/data';
import type { UsersSearch } from '../../model/types';
import { RoleSelect } from '../form/role-select';
import { UserError } from '../user-error';
import { UserLoading } from '../user-loading';
import { SearchInput } from './search-input';
import { UserResults } from './user-results';

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

export function UsersList({ search, onFilterChange, onPageChange }: UsersListProperties) {
  const query = useListUsers({ query: getUsersQuery(search) }, { query: { retry: false } });
  useUserAccessError(query.error);
  const offset = search.offset ?? 0;
  const activity = search.isActive ? 'active' : 'inactive';

  useEffect(() => {
    if (!(query.data && offset > 0 && offset >= query.data.total)) {
      return;
    }

    const lastOffset = Math.max(0, Math.ceil(query.data.total / 20) - 1) * 20;
    onPageChange(lastOffset, true);
  }, [query.data, offset, onPageChange]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-semibold text-2xl">Пользователи</h1>
          <p className="text-muted-foreground text-sm">Сотрудники, роли и доступ к системе</p>
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
        {query.isFetching && !query.isPending && (
          <p className="text-muted-foreground text-sm" role="status">
            Обновляем список…
          </p>
        )}
        {query.isPending && <UserLoading />}
        {query.isError && <UserError message={userErrorMessage(query.error)} retry={() => void query.refetch()} />}
        {query.isSuccess && (
          <>
            <p className="text-muted-foreground text-sm" aria-live="polite">
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
      </section>
    </div>
  );
}
