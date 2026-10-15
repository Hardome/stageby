import { Button } from '@shared/ui/button';
import { Skeleton } from '@shared/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@shared/ui/table';

import { UserCardSkeleton } from './user-card-skeleton';
import { UserTableHeader } from './user-table-header';

export function UsersListSkeleton() {
  return (
    <div aria-hidden="true" className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        Найдено: <Skeleton className="h-5 w-10" />
      </div>
      <div className="hidden md:block">
        <Table>
          <UserTableHeader />
          <TableBody>
            {[1, 2, 3].map((row) => (
              <TableRow key={row}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-24" />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Skeleton className="size-12" />
                    <Skeleton className="size-12" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-col gap-3 md:hidden">
        {[1, 2, 3].map((row) => (
          <li key={row}>
            <UserCardSkeleton />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" disabled>
          Назад
        </Button>
        <Skeleton className="h-5 w-32" />
        <Button variant="outline" disabled>
          Далее
        </Button>
      </div>
    </div>
  );
}
