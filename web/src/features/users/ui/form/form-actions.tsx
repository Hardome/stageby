import { Link } from '@tanstack/react-router';

import { Button } from '@shared/ui/button';
import { Spinner } from '@shared/ui/spinner';

import type { UsersSearch } from '../../model/types';

interface FormActionsProperties {
  pending: boolean;
  disabled?: boolean;
  search: UsersSearch;
  label?: string;
}

export function FormActions({
  pending,
  disabled = false,
  search,
  label = 'Сохранить',
}: Readonly<FormActionsProperties>) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button variant="success" className="min-h-11" type="submit" disabled={pending || disabled}>
        {pending && <Spinner data-icon="inline-start" />}
        {pending ? 'Сохраняем…' : label}
      </Button>
      <Button
        className="min-h-11"
        disabled={pending}
        variant="outline"
        nativeButton={false}
        render={<Link to="/users" search={search} />}
      >
        Отмена
      </Button>
    </div>
  );
}
