import { type SubmitEvent, useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  type ProjectFormValues,
  projectDraftSchema,
  projectFormSchema,
  useDocuments,
  useProjectNavigation,
} from '@entities/project';
import { useAccessError, useSessionFormDraft } from '@shared/lib/hooks';

import { initialProjectForm } from '../model/data';
import type { CreateProjectFormProperties } from '../model/types';
import { useProjectSubmission } from './use-project-submission';

export function useProjectCreationForm({ types, onDirtyChange, onSuccess }: CreateProjectFormProperties) {
  const form = useForm<ProjectFormValues>({
    defaultValues: initialProjectForm(types),
    resolver: zodResolver(projectFormSchema),
    mode: 'onChange',
    shouldFocusError: false,
  });

  const clearDraft = useSessionFormDraft(form, 'create-project:v1', projectDraftSchema);

  const navigation = useProjectNavigation(form);

  const accessError = useAccessError();

  const uploads = useDocuments({ onAccessError: accessError });

  const isDirty = form.formState.isDirty || uploads.documents.length > 0;

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const submission = useProjectSubmission({
    form,
    onSuccess: async () => {
      clearDraft();
      await onSuccess();
    },
    onInvalid: (isFileError) => {
      if (isFileError) navigation.showObject();
      else navigation.revealErrors();
    },
  });

  const isLocked = submission.isPending || submission.hasSnapshot;

  const hasUnfinishedUploads = uploads.documents.some((document) => document.status !== 'uploaded');

  function next() {
    if (!isLocked) void navigation.next();
  }

  async function save(values: ProjectFormValues) {
    if (hasUnfinishedUploads) return;

    await submission.save(
      values,
      uploads.documents.flatMap((document) => document.fileId || []),
    );
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (navigation.screen === 'object') next();
    else if (submission.hasSnapshot) void save(form.getValues());
    else void form.handleSubmit(save, navigation.revealErrors)(event);
  }

  return { form, navigation, uploads, submission, isLocked, hasUnfinishedUploads, next, submit };
}
