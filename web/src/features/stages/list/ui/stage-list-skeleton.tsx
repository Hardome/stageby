import { Button } from '@shared/ui/button';
import { Skeleton } from '@shared/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@shared/ui/table';

import { StageListCardSkeleton } from './stage-list-card-skeleton';
import { StageListTableHeader } from './stage-list-table-header';

export function StageListSkeleton() {
  return (
    <div aria-hidden="true" className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        Найдено: <Skeleton className="h-5 w-10" />
      </div>
      <ul className="grid gap-4 md:hidden">
        {[1, 2, 3].map((row) => (
          <li key={row}>
            <StageListCardSkeleton />
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <StageListTableHeader />
          <TableBody>
            {[1, 2, 3].map((row) => (
              <TableRow key={row}>
                <TableCell className="max-w-64 whitespace-normal">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-5 w-44" />
                  </div>
                </TableCell>
                <TableCell className="max-w-64 whitespace-normal">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm">
                    {['План:', 'Факт:'].map((label) => (
                      <div key={label} className="flex items-center gap-2">
                        {label}
                        <Skeleton className="h-5 w-20" />
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-10 w-32" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
