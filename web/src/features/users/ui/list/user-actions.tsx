import { Link } from '@tanstack/react-router';
import { KeyRoundIcon, PencilIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';

import type { User } from '@api/types';

import type { UsersSearch } from '../../model/types';

interface UserActionsProperties {
  user: User;
  search: UsersSearch;
}

export function UserActions({ user, search }: UserActionsProperties) {
  const parameters = { userId: String(user.id) };
  return (
    <div className="flex gap-2">
      <Button
        className="md:size-12 md:p-0 md:has-data-[icon=inline-start]:pl-0"
        variant="outline"
        size="sm"
        nativeButton={false}
        aria-label={`Редактировать: ${user.fullName}`}
        render={<Link to="/users/$userId/edit" params={parameters} search={search} />}
      >
        <PencilIcon data-icon="inline-start" />
        <span className="md:sr-only">Редактировать</span>
      </Button>
      <Button
        className="md:size-12 md:p-0 md:has-data-[icon=inline-start]:pl-0"
        variant="outline"
        size="sm"
        nativeButton={false}
        aria-label={`Сменить пароль: ${user.fullName}`}
        render={<Link to="/users/$userId/password" params={parameters} search={search} />}
      >
        <KeyRoundIcon data-icon="inline-start" />
        <span className="md:sr-only">Сменить пароль</span>
      </Button>
    </div>
  );
}
