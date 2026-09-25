import { useQueryClient } from '@tanstack/react-query';
import { Trash2Icon } from 'lucide-react';

import { Button } from '@shared/ui/button';

import { useDeleteTodo } from '@api/mutations/useDeleteTodo';
import { listTodosQueryKey } from '@api/queries/useListTodos';

type DeleteTodoButtonProperties = {
  id: string;
  title: string;
};

export function DeleteTodoButton({ id, title }: DeleteTodoButtonProperties) {
  const queryClient = useQueryClient();
  const mutation = useDeleteTodo<unknown>({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: listTodosQueryKey() });
      },
    },
  });

  return (
    <Button
      aria-label={`Удалить задачу «${title}»`}
      disabled={mutation.isPending}
      onClick={() => mutation.mutate({ path: { id } })}
      size="icon"
      title="Удалить задачу"
      type="button"
      variant="destructive"
    >
      <Trash2Icon data-icon="inline-start" />
    </Button>
  );
}
