import { type AuthContextValue, useAuth } from '@shared/context';

interface AuthTestProbeProperties {
  onSession: (session: AuthContextValue) => void;
}

export function AuthTestProbe({ onSession }: Readonly<AuthTestProbeProperties>) {
  const session = useAuth();
  onSession(session);

  return <p>{session.user?.login ?? 'Вход'}</p>;
}
