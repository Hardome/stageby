import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

import { useCreateTodo } from '@api/mutations/useCreateTodo';
import { listTodosQueryKey } from '@api/queries/useListTodos';
import type { CreateTodoSchemaType } from '@api/zod/createTodoSchema';
import { createTodoSchema as todoCreationSchema } from '@api/zod/createTodoSchema';

const inputClassName =
  'h-12 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-700/10 disabled:cursor-wait disabled:opacity-60';

export function CreateTodoForm() {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateTodoSchemaType>({
    resolver: zodResolver(todoCreationSchema),
    defaultValues: { title: '', description: '' },
  });
  const mutation = useCreateTodo<unknown>({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: listTodosQueryKey() });
      },
    },
  });

  const onSubmit = (values: CreateTodoSchemaType) => {
    const title = values.title.trim();

    if (!title) {
      setError('title', { type: 'validate' });
      return;
    }

    mutation.mutate({ body: { title, description: values.description?.trim() || null } }, { onSuccess: () => reset() });
  };

  return (
    <form
      className="relative grid gap-3 border-stone-200 border-b pb-8 sm:grid-cols-[1fr_auto]"
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
    >
      <div className="grid gap-2">
        <label>
          <span className="sr-only">Название задачи</span>
          <input
            aria-describedby={errors.title ? 'todo-title-error' : undefined}
            aria-invalid={Boolean(errors.title)}
            autoComplete="off"
            className={inputClassName}
            disabled={mutation.isPending}
            maxLength={255}
            placeholder="Что нужно сделать?"
            {...register('title')}
          />
        </label>
        {errors.title && (
          <p className="m-0 text-red-700 text-xs" id="todo-title-error" role="alert">
            Введите название задачи (до 255 символов).
          </p>
        )}
        <label>
          <span className="sr-only">Описание задачи</span>
          <input
            autoComplete="off"
            className={`${inputClassName} h-10 text-sm`}
            disabled={mutation.isPending}
            placeholder="Короткое описание (необязательно)"
            {...register('description')}
          />
        </label>
      </div>
      <button
        className="h-12 rounded-xl bg-emerald-900 px-6 font-bold text-white transition hover:-translate-y-px hover:bg-emerald-950 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        disabled={mutation.isPending}
        type="submit"
      >
        {mutation.isPending ? 'Добавляем…' : 'Добавить'}
      </button>
      {mutation.isError && (
        <p className="absolute bottom-2 left-0 m-0 text-red-700 text-xs" id="create-todo-error" role="alert">
          Не удалось добавить задачу. Попробуйте ещё раз.
        </p>
      )}
    </form>
  );
}
