import type { PropsWithChildren } from 'react';

import { useAuthSession } from '../lib/use-auth-session';
import { AuthContext } from '../model/context';

export function AuthProvider({ children }: Readonly<PropsWithChildren>) {
  const session = useAuthSession();

  return <AuthContext value={session}>{children}</AuthContext>;
}
