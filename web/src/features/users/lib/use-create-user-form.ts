import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useCreateUser } from '@api/mutations/useCreateUser';

import { emptyDraft } from '../model/data';
import type { CreateFormOutput, CreateFormValues, UsersSearch } from '../model/types';
import { clearCreateDraft, loadCreateDraft, saveCreateDraft } from './create-draft';
import { userCreationFormSchema } from './schemas';
import { notifyUserError, userErrorMessage, useUserAccessError, useUserActions } from './use-user-actions';

export function useCreateUserForm(managerId: number, search: UsersSearch) {
  const form = useForm<CreateFormValues, unknown, CreateFormOutput>({
    resolver: zodResolver(userCreationFormSchema),
    defaultValues: () => Promise.resolve({ ...loadCreateDraft(managerId), password: '', confirmPassword: '' }),
    mode: 'onChange',
  });

  const { finish } = useUserActions(search);

  const mutation = useCreateUser({
    mutation: {
      onSuccess: async (user) => {
        clearCreateDraft(managerId);
        await finish('created', user);
      },
      onError: (error) => {
        if (error.data?.code === 'login_taken') {
          form.setError('login', { type: 'server', message: userErrorMessage(error) }, { shouldFocus: true });

          return;
        }
        notifyUserError(error);
      },
    },
  });

  useUserAccessError(mutation.error);

  const {
    subscribe,
    reset,
    handleSubmit,
    formState: { errors, isLoading },
  } = form;

  const loginValidationMessage = errors.login
    ? 'От 3 до 64 символов: строчные латинские буквы, цифры, точка, дефис, подчёркивание. ' +
      'Первый символ — буква или цифра.'
    : undefined;

  useEffect(
    () => subscribe({ formState: { values: true }, callback: ({ values }) => saveCreateDraft(managerId, values) }),
    [subscribe, managerId],
  );

  function clearDraft() {
    reset({ ...emptyDraft, role: undefined, password: '', confirmPassword: '' });
    clearCreateDraft(managerId);
    mutation.reset();
  }

  const submit = handleSubmit(({ confirmPassword: _confirmation, ...body }) => mutation.mutate({ body }));

  return { form, mutation, errors, isLoading, loginValidationMessage, clearDraft, submit };
}
