import { TableHead, TableHeader, TableRow } from '@shared/ui/table';

export function ProjectStageTableHead() {
  return (
    <TableHeader>
      <TableRow>
        {[
          'Этап, готовность и сроки',
          'Статус',
          'Мастер',
          'Материалы',
          'Работы: план / факт',
          'Материалы: план / факт',
        ].map((heading) => (
          <TableHead key={heading} scope="col">
            {heading}
          </TableHead>
        ))}
        <TableHead scope="col">
          <span className="sr-only">Открыть этап</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}
