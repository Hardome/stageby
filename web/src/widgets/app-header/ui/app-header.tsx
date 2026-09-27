import { useAuth } from '@shared/context';

import { HeaderContent } from './header-content';

export function AppHeader() {
  const { user } = useAuth();
  return user ? <HeaderContent user={user} /> : null;
}
