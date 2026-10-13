import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { type ProjectFormValues, useDocuments, useProjectNavigation } from '@entities/project';
import { useAccessError } from '@shared/lib/hooks';

import type { EditProjectFormProperties } from '../model/types';
import { projectEditSchema, projectEditValues } from './project-edit-form';
import { projectExclusionReasons } from './project-exclusion-reasons';
import { useAdditionalStage } from './use-additional-stage';
import { useProjectUpdate } from './use-project-update';

export function useProjectEditForm({ snapshot, onDirtyChange, onSuccess, onReload }: EditProjectFormProperties) {
  const form = useForm<ProjectFormValues>({
    defaultValues: projectEditValues(snapshot),
    resolver: zodResolver(projectEditSchema(snapshot)),
    mode: 'onChange',
    shouldFocusError: false,
  });

  const navigation = useProjectNavigation(form);
  const additionalStage = useAdditionalStage(form, navigation);
  const uploads = useDocuments({ onAccessError: useAccessError() });

  const [fileIds, setFileIds] = useState(snapshot.project.documentFileIds);
  const [confirmReload, setConfirmReload] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [reloadError, setReloadError] = useState('');

  const isDirty =
    form.formState.isDirty ||
    uploads.documents.length > 0 ||
    fileIds.length !== snapshot.project.documentFileIds.length;

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const update = useProjectUpdate({
    snapshot,
    form,
    onSuccess,
    onInvalid: (isFileError) => {
      if (isFileError) navigation.showObject();
      else navigation.revealErrors();
    },
  });

  const isLocked = update.isPending || update.unavailable || reloading;
  const hasUnfinishedUploads = uploads.documents.some((document) => document.status !== 'uploaded');
  const exclusionReasons = projectExclusionReasons(snapshot, navigation.stages);

  async function reload() {
    setReloading(true);
    setReloadError('');

    try {
      await onReload();
    } catch {
      setReloadError('Не удалось загрузить актуальные данные. Правки сохранены в форме.');
    } finally {
      setReloading(false);
      setConfirmReload(false);
    }
  }

  async function save(values: ProjectFormValues) {
    if (isLocked || hasUnfinishedUploads) return;

    await update.save(values, [
      ...fileIds,
      ...uploads.documents.flatMap((document) => (document.fileId ? [document.fileId] : [])),
    ]);
  }

  function removeDocument(id: number) {
    setFileIds((previous) => previous.filter((fileId) => fileId !== id));
  }

  return {
    form,
    navigation,
    additionalStage,
    uploads,
    update,
    fileIds,
    removeDocument,
    exclusionReasons,
    isLocked,
    hasUnfinishedUploads,
    confirmReload,
    setConfirmReload,
    reloading,
    reloadError,
    reload,
    save,
  };
}
