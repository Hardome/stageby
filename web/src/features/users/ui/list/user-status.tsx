import { Badge } from '@shared/ui/badge';

import type { User } from '@api/types';

interface UserStatusProperties {
  user: User;
}

export function UserStatus({ user }: Readonly<UserStatusProperties>) {
  return <Badge variant={user.isActive ? 'success' : 'outline'}>{user.isActive ? 'Активен' : 'Неактивен'}</Badge>;
}
