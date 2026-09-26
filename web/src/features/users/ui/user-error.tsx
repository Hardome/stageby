import { Button } from '@shared/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@shared/ui/empty';

interface UserErrorProperties {
  message: string;
  retry?: () => void;
}

export function UserError({ message, retry }: UserErrorProperties) {
  return (
    <Empty role="status">
      <EmptyHeader>
        <EmptyTitle>Не удалось загрузить данные</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      {retry && (
        <Button className="min-h-11" variant="outline" type="button" onClick={retry}>
          Повторить
        </Button>
      )}
    </Empty>
  );
}
