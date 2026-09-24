import { useQueryClient } from '@tanstack/react-query';

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
    <button
      aria-label={`Удалить задачу «${title}»`}
      className="grid size-9 place-items-center rounded-xl bg-transparent text-2xl text-stone-400 leading-none transition hover:bg-red-50 hover:text-red-700 focus-visible:bg-red-50 focus-visible:text-red-700 disabled:cursor-wait disabled:opacity-50"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate({ path: { id } })}
      title="Удалить задачу"
      type="button"
    >
      <span aria-hidden="true">×</span>
    </button>
  );
}
