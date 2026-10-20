import { Skeleton } from '@shared/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@shared/ui/table';

import { ProjectStageTableHead } from './project-stage-table-head';

export function ProjectStageTableSkeleton() {
  return (
    <Table aria-label="Загрузка этапов объекта">
      <ProjectStageTableHead />
      <TableBody>
        {[1, 2].map((row) => (
          <TableRow key={row}>
            <TableCell className="min-w-56">
              <Skeleton className="h-5 w-36" />
              <div className="mt-2 flex max-w-40 flex-col gap-1.5">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-1.5 w-full" />
              </div>
              <Skeleton className="mt-1 h-4 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-32" />
            </TableCell>
            <TableCell className="min-w-44">
              <Skeleton className="h-5 w-36" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="size-4" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
