import { type SubmitEvent, useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useRequestPasswordReset } from '@api/mutations/useRequestPasswordReset';
import {
  type RequestPasswordResetBodySchemaType,
  requestPasswordResetBodySchema,
} from '@api/zod/requestPasswordResetSchema';

function resetErrorMessage(status?: number): string {
  if (status === 400) return 'Проверьте логин и повторите попытку.';

  return status === 429
    ? 'Слишком много запросов. Подождите и повторите попытку.'
    : 'Не удалось отправить запрос. Проверьте соединение и попробуйте ещё раз.';
}

export function usePasswordResetForm() {
  const form = useForm<RequestPasswordResetBodySchemaType>({
    resolver: zodResolver(requestPasswordResetBodySchema),
    defaultValues: { login: '' },
    mode: 'onChange',
  });

  const submitting = useRef(false);
  const completed = useRef(false);
  const mutation = useRequestPasswordReset({ mutation: { retry: false } });

  async function submit(values: RequestPasswordResetBodySchemaType) {
    if (submitting.current || completed.current) return;

    submitting.current = true;

    try {
      await mutation.mutateAsync({ body: values });
      completed.current = true;
    } catch {
      // Ошибка остаётся в состоянии мутации, введённый логин сохраняется для повтора.
    } finally {
      submitting.current = false;
    }
  }

  return {
    form,
    submit: (event: SubmitEvent<HTMLFormElement>) => form.handleSubmit(submit)(event),
    pending: mutation.isPending || form.formState.isSubmitting,
    success: mutation.isSuccess,
    error: mutation.isError ? resetErrorMessage(mutation.error?.status) : undefined,
    clearError: mutation.reset,
  };
}
