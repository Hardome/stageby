import { TableHead, TableHeader, TableRow } from '@shared/ui/table';

export function DashboardProjectTableHeader() {
  return (
    <TableHeader>
      <TableRow className="bg-muted/40">
        {['Объект', 'Текущий этап', 'Материалы', 'Мастер', 'Статус этапа'].map((title) => (
          <TableHead key={title} scope="col">
            {title}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}
