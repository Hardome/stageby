import { Badge } from '@shared/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';

import type { User } from '@api/types';

import { roleLabels } from '../../model/data';
import type { UsersSearch } from '../../model/types';
import { UserActions } from './user-actions';
import { UserStatus } from './user-status';

interface UserResultsProperties {
  users: User[];
  search: UsersSearch;
}

export function UserResults({ users, search }: UserResultsProperties) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Имя / логин</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Телефон</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="wrap-anywhere max-w-72 whitespace-normal font-medium">{user.fullName}</div>
                  <div className="wrap-anywhere max-w-72 whitespace-normal text-muted-foreground">{user.login}</div>
                </TableCell>
                <TableCell>{roleLabels[user.role]}</TableCell>
                <TableCell>{user.phone ?? '—'}</TableCell>
                <TableCell>
                  <UserStatus user={user} />
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
                <p className="wrap-anywhere text-muted-foreground text-sm">{user.login}</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{roleLabels[user.role]}</Badge>
                  <UserStatus user={user} />
                </div>
                <p className="wrap-anywhere text-sm">Телефон: {user.phone ?? 'не указан'}</p>
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
