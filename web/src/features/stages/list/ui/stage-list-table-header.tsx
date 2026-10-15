import { TableHead, TableHeader, TableRow } from '@shared/ui/table';

export function StageListTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        {['Клиент и адрес', 'Этап и даты', 'Работы', 'Статус', 'Действия'].map((title) => (
          <TableHead key={title} scope="col">
            {title}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}
