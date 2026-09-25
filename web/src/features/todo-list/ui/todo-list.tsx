import { ListTodoIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@shared/ui/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@shared/ui/item';
import { Separator } from '@shared/ui/separator';
import { Skeleton } from '@shared/ui/skeleton';

import { useListTodos } from '@api/queries/useListTodos';
import type { Todo } from '@api/types';

import { CreateTodoForm } from './create-form';
import { DeleteTodoButton } from './delete-button';
import { ToggleTodoCheckbox } from './toggle-todo-checkbox';

function TodoListItem({ todo }: { todo: Todo }) {
  return (
    <Item data-completed={todo.completed} render={<li />} variant="outline">
      <ItemMedia>
        <ToggleTodoCheckbox completed={todo.completed} id={todo.id} title={todo.title} />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="group-data-[completed=true]/item:text-muted-foreground group-data-[completed=true]/item:line-through">
          {todo.title}
        </ItemTitle>
        {todo.description && <ItemDescription>{todo.description}</ItemDescription>}
      </ItemContent>
      <ItemActions>
        <DeleteTodoButton id={todo.id} title={todo.title} />
      </ItemActions>
    </Item>
  );
}

export function TodoList() {
  const todos = useListTodos();

  if (todos.isPending) {
    return (
      <div aria-live="polite" className="flex flex-col gap-3">
        <span className="sr-only">Загружаем задачи…</span>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (todos.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Не удалось загрузить задачи.</AlertTitle>
        <AlertDescription>Проверьте соединение и попробуйте ещё раз.</AlertDescription>
        <Button onClick={() => void todos.refetch()} size="sm" type="button" variant="outline">
          Повторить
        </Button>
      </Alert>
    );
  }

  const completedCount = todos.data.filter((todo) => todo.completed).length;

  return (
    <div className="flex flex-col gap-6">
      <CreateTodoForm />
      <Separator />
      <section aria-label="Список задач" className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Всего: {todos.data.length}</Badge>
          <Badge variant="outline">Выполнено: {completedCount}</Badge>
        </div>
        {todos.data.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListTodoIcon />
              </EmptyMedia>
              <EmptyTitle>Список пока пуст</EmptyTitle>
              <EmptyDescription>Добавьте первую задачу — она появится здесь.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup>
            {todos.data.map((todo) => (
              <TodoListItem key={todo.id} todo={todo} />
            ))}
          </ItemGroup>
        )}
      </section>
    </div>
  );
}
