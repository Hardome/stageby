import { type Ref, useEffect, useState } from 'react';

import { useInfiniteQuery } from '@tanstack/react-query';

import { errorStatus, useAccessError, useDebouncedValue } from '@shared/lib/hooks';
import { Button } from '@shared/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@shared/ui/combobox';
import { Field, FieldDescription, FieldError, FieldLabel } from '@shared/ui/field';

import { listUsers } from '@api/clients/listUsers';
import { listUsersQueryKey } from '@api/queries/useListUsers';

interface AssigneePickerProperties {
  id: string;
  disabled: boolean;
  value: AssigneeOption | null;
  onChange: (value: AssigneeOption | null) => void;
  onBlur?: () => void;
  ref?: Ref<HTMLInputElement>;
  error?: string;
}

interface AssigneeOption {
  id: number;
  label: string;
}

export function AssigneePicker({ id, disabled, value, onChange, onBlur, ref, error }: AssigneePickerProperties) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search?.trim().slice(0, 100) ?? '', 250);

  const accessError = useAccessError();
  const query = { role: 'foreman' as const, isActive: true, limit: 20, search: debouncedSearch || undefined };

  const users = useInfiniteQuery({
    queryKey: [...listUsersQueryKey({ query }), 'assignee-picker'],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => listUsers({ query: { ...query, offset: pageParam }, signal }).unwrap(),
    getNextPageParam: (page) =>
      page.offset + page.items.length < page.total ? page.offset + page.items.length : undefined,
  });

  useEffect(() => {
    if (users.error) accessError(users.error);
  }, [users.error, accessError]);

  const items: AssigneeOption[] =
    users.data?.pages.flatMap((page) =>
      page.items.map((user) => ({ id: user.id, label: `${user.fullName} · ${user.login}` })),
    ) ?? [];

  let emptyMessage = users.isPending ? 'Загрузка мастеров…' : 'Мастера не найдены';

  if (users.isError) emptyMessage = 'Не удалось загрузить мастеров';

  const accessMessage = errorStatus(users.error) === 403 ? 'Недостаточно прав для просмотра мастеров.' : emptyMessage;

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>Мастер</FieldLabel>
      <Combobox
        items={items}
        filter={null}
        value={value}
        itemToStringLabel={(item: AssigneeOption) => item.label}
        isItemEqualToValue={(item, value) => item.id === value.id}
        disabled={disabled}
        onInputValueChange={(value, details) => {
          if (details.reason === 'input-change') setSearch(value);
        }}
        onValueChange={(value: AssigneeOption | null) => {
          onChange(value);
          setSearch('');
        }}
      >
        <ComboboxInput
          id={id}
          ref={ref}
          onBlur={onBlur}
          placeholder="Не назначен — поиск по имени"
          showClear
          maxLength={100}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-12"
        />
        <ComboboxContent aria-busy={users.isFetching}>
          <ComboboxEmpty>{accessMessage}</ComboboxEmpty>
          <ComboboxList>
            {(item: AssigneeOption) => (
              <ComboboxItem key={item.id} value={item} className="wrap-anywhere min-h-12">
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
          {users.isFetching && items.length > 0 && (
            <FieldDescription role="status" className="px-2 py-1.5">
              Обновление списка мастеров…
            </FieldDescription>
          )}
          {users.isError && (
            <Button type="button" variant="ghost" disabled={users.isFetching} onClick={() => void users.refetch()}>
              Повторить загрузку
            </Button>
          )}
          {users.hasNextPage && (
            <Button
              type="button"
              variant="ghost"
              disabled={users.isFetching}
              onClick={() => void users.fetchNextPage()}
            >
              {users.isFetchingNextPage ? 'Загрузка…' : 'Показать ещё'}
            </Button>
          )}
        </ComboboxContent>
      </Combobox>
      {users.isError && <FieldError role="alert">{accessMessage}</FieldError>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}
