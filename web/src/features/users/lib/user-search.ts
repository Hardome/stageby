import type { ListUsersQuery } from '@api/types';

import type { UsersSearch } from '../model/types';
import { searchSchema } from './schemas';

export function parseUsersSearch(value: unknown): UsersSearch {
  return searchSchema.parse(value);
}

export function getUsersQuery(search: UsersSearch): ListUsersQuery {
  return {
    limit: 20,
    offset: search.offset ?? 0,
    search: search.search || undefined,
    role: search.role,
    isActive: search.isActive,
  };
}
