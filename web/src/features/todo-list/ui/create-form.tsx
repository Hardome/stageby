import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@shared/ui/field';
import { Input } from '@shared/ui/input';
import { Spinner } from '@shared/ui/spinner';

import { useCreateTodo } from '@api/mutations/useCreateTodo';
import { listTodosQueryKey } from '@api/queries/useListTodos';
import type { CreateTodoSchemaType } from '@api/zod/createTodoSchema';
import { createTodoSchema as todoCreationSchema } from '@api/zod/createTodoSchema';

const formSchema = todoCreationSchema.safeExtend({
  title: z.string().trim().min(1).max(255),
});

export function CreateTodoForm() {
  const queryClient = useQueryClient();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTodoSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', description: '' },
    mode: 'onChange',
  });

  const mutation = useCreateTodo<unknown>({
    mutation: {
      onSuccess: () => {
        reset();
        void queryClient.invalidateQueries({ queryKey: listTodosQueryKey() });
      },
    },
  });

  const onSubmit = (values: CreateTodoSchemaType) => {
    mutation.mutate({ body: { title: values.title, description: values.description?.trim() || null } });
  };

  return (
    <form className="flex flex-col gap-4" noValidate onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <FieldGroup className="gap-3">
          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel className="sr-only" htmlFor="todo-title">
              Название задачи
            </FieldLabel>
            <Controller
              control={control}
              name="title"
              render={({ field }) => (
                <Input
                  {...field}
                  aria-describedby={errors.title ? 'todo-title-error' : undefined}
                  aria-invalid={Boolean(errors.title)}
                  autoComplete="off"
                  disabled={mutation.isPending}
                  id="todo-title"
                  maxLength={255}
                  placeholder="Что нужно сделать?"
                />
              )}
            />
            {errors.title && <FieldError id="todo-title-error">Введите название задачи (до 255 символов).</FieldError>}
          </Field>
          <Field>
            <FieldLabel className="sr-only" htmlFor="todo-description">
              Описание задачи
            </FieldLabel>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value ?? ''}
                  autoComplete="off"
                  disabled={mutation.isPending}
                  id="todo-description"
                  placeholder="Короткое описание (необязательно)"
                />
              )}
            />
          </Field>
        </FieldGroup>
        <Button className="w-full sm:w-auto" disabled={mutation.isPending} size="lg" type="submit">
          {mutation.isPending ? (
            <Spinner aria-label="Добавляем задачу" data-icon="inline-start" />
          ) : (
            <PlusIcon data-icon="inline-start" />
          )}
          {mutation.isPending ? 'Добавляем…' : 'Добавить'}
        </Button>
      </div>
      {mutation.isError && (
        <Alert variant="destructive">
          <AlertDescription>Не удалось добавить задачу. Попробуйте ещё раз.</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
