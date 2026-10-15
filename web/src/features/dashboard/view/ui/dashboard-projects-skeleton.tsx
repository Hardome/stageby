import { Button } from '@shared/ui/button';
import { Skeleton } from '@shared/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@shared/ui/table';

import { DashboardProjectCardSkeleton } from './dashboard-project-card-skeleton';
import { DashboardProjectTableHeader } from './dashboard-project-table-header';

export function DashboardProjectsSkeleton() {
  return (
    <div aria-hidden="true" className="flex min-w-0 flex-col gap-4">
      <ul className="grid gap-4 md:hidden">
        {[1, 2, 3].map((row) => (
          <li key={row} className="min-w-0">
            <DashboardProjectCardSkeleton />
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <DashboardProjectTableHeader />
          <TableBody>
            {[1, 2, 3].map((row) => (
              <TableRow key={row}>
                <TableCell className="max-w-72 whitespace-normal">
                  <div className="flex min-h-12 flex-col gap-1.5">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-44" />
                  </div>
                </TableCell>
                <TableCell className="max-w-64 whitespace-normal">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </TableCell>
                <TableCell className="max-w-64 whitespace-normal">
                  <div className="flex min-h-10 items-center">
                    <Skeleton className="h-6 w-32" />
                  </div>
                </TableCell>
                <TableCell className="max-w-56 whitespace-normal">
                  <Skeleton className="h-5 w-32" />
                </TableCell>
                <TableCell>
                  <div className="flex min-h-10 items-center">
                    <Skeleton className="h-6 w-28" />
                  </div>
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
