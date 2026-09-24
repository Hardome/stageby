import { useQueryClient } from '@tanstack/react-query';

import { useUpdateTodo } from '@api/mutations/useUpdateTodo';
import { listTodosQueryKey } from '@api/queries/useListTodos';

type ToggleTodoCheckboxProperties = {
  completed: boolean;
  id: string;
  title: string;
};

export function ToggleTodoCheckbox({ completed, id, title }: ToggleTodoCheckboxProperties) {
  const queryClient = useQueryClient();
  const updateTodo = useUpdateTodo<unknown>({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: listTodosQueryKey() });
      },
    },
  });

  return (
    <label className="relative grid size-6 cursor-pointer place-items-center">
      <input
        checked={completed}
        className="peer sr-only"
        disabled={updateTodo.isPending}
        onChange={() => updateTodo.mutate({ body: { completed: !completed }, path: { id } })}
        type="checkbox"
      />
      <span
        aria-hidden="true"
        className="grid size-6 place-items-center rounded-lg border-2 border-stone-300 font-black text-transparent text-xs transition peer-checked:border-emerald-700 peer-checked:bg-emerald-700 peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-emerald-700/25 peer-focus-visible:outline-offset-2 peer-disabled:opacity-50"
      >
        ✓
      </span>
      <span className="sr-only">
        {completed ? `Отметить задачу «${title}» невыполненной` : `Отметить задачу «${title}» выполненной`}
      </span>
    </label>
  );
}
