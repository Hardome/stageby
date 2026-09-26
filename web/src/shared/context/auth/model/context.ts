import { createContext } from 'react';

import type { User } from '@api/types';

export interface AuthContextValue {
  user: User | null;
  isPending: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
  clearSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
