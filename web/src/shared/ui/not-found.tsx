import { buttonVariants } from './button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from './empty';

export function NotFound() {
  return (
    <Empty role="alert">
      <EmptyHeader>
        <EmptyTitle>
          <h1>404 — Страница не найдена</h1>
        </EmptyTitle>
        <EmptyDescription>Проверьте адрес или вернитесь на главную.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <a href="/" className={buttonVariants()}>
          На главную
        </a>
      </EmptyContent>
    </Empty>
  );
}
