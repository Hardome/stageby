import { Badge } from '@shared/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@shared/ui/table';

import type { User } from '@api/types';

import { roleLabels } from '../../model/data';
import type { UsersSearch } from '../../model/types';
import { PasswordResetStatus } from '../password-reset-status';
import { UserActions } from './user-actions';
import { UserStatus } from './user-status';
import { UserTableHeader } from './user-table-header';

interface UserResultsProperties {
  users: User[];
  search: UsersSearch;
}

export function UserResults({ users, search }: Readonly<UserResultsProperties>) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <UserTableHeader />
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="max-w-72 font-medium wrap-anywhere whitespace-normal">{user.fullName}</div>
                  <div className="max-w-72 wrap-anywhere whitespace-normal text-muted-foreground">{user.login}</div>
                </TableCell>
                <TableCell>{roleLabels[user.role]}</TableCell>
                <TableCell>{user.phone ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-2">
                    <UserStatus user={user} />
                    <PasswordResetStatus requestedAt={user.passwordResetRequestedAt} />
                  </div>
                </TableCell>
                <TableCell>
                  <UserActions user={user} search={search} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-col gap-3 md:hidden">
        {users.map((user) => (
          <li key={user.id}>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2 className="wrap-anywhere">{user.fullName}</h2>
                </CardTitle>
                <p className="text-sm wrap-anywhere text-muted-foreground">{user.login}</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{roleLabels[user.role]}</Badge>
                  <UserStatus user={user} />
                  <PasswordResetStatus requestedAt={user.passwordResetRequestedAt} />
                </div>
                <p className="text-sm wrap-anywhere">Телефон: {user.phone ?? 'не указан'}</p>
              </CardContent>
              <CardFooter>
                <UserActions user={user} search={search} />
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
