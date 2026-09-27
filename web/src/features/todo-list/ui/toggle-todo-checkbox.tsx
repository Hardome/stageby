import { useQueryClient } from '@tanstack/react-query';

import { Checkbox } from '@shared/ui/checkbox';

import { useUpdateTodo } from '@api/mutations/useUpdateTodo';
import { listTodosQueryKey } from '@api/queries/useListTodos';

interface ToggleTodoCheckboxProperties {
  completed: boolean;
  id: string;
  title: string;
}

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
    <Checkbox
      aria-label={completed ? `Отметить задачу «${title}» невыполненной` : `Отметить задачу «${title}» выполненной`}
      checked={completed}
      disabled={updateTodo.isPending}
      onCheckedChange={(checked) => updateTodo.mutate({ body: { completed: checked }, path: { id } })}
    />
  );
}
