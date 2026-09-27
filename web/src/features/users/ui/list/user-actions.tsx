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
    <div className="flex flex-wrap gap-2">
      <Button
        className="min-h-11"
        variant="outline"
        nativeButton={false}
        aria-label={`Редактировать: ${user.fullName}`}
        render={<Link to="/users/$userId/edit" params={parameters} search={search} />}
      >
        <PencilIcon data-icon="inline-start" />
        <span className="md:sr-only">Редактировать</span>
      </Button>
      <Button
        className="min-h-11"
        variant="outline"
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
