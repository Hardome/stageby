import { Badge } from '@shared/ui/badge';

import type { User } from '@api/types';

interface UserStatusProperties {
  user: User;
}

export function UserStatus({ user }: UserStatusProperties) {
  return <Badge variant={user.isActive ? 'secondary' : 'outline'}>{user.isActive ? 'Активен' : 'Неактивен'}</Badge>;
}
