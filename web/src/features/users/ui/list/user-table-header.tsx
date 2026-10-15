import { TableHead, TableHeader, TableRow } from '@shared/ui/table';

export function UserTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        {['Имя / логин', 'Роль', 'Телефон', 'Статус', 'Действия'].map((title) => (
          <TableHead key={title} scope="col">
            {title}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}
