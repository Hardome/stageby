import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';

import {
  ObjectStep,
  type ProjectFormValues,
  ProjectProgress,
  StageEditor,
  StagesStep,
  UnfinishedUploadsWarning,
  useDocuments,
  useProjectNavigation,
} from '@entities/project';
import { useAccessError } from '@shared/lib/hooks';
import { Alert, AlertDescription } from '@shared/ui/alert';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shared/ui/alert-dialog';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { FieldError } from '@shared/ui/field';
import { Spinner } from '@shared/ui/spinner';

import type { ProjectEdit } from '@api/types';

import { projectEditSchema, projectEditValues } from '../lib/project-edit-form';
import { useProjectUpdate } from '../lib/use-project-update';
import { SavedDocuments } from './saved-documents';

export interface EditProjectFormProperties {
  snapshot: ProjectEdit;
  onDirtyChange: (isDirty: boolean) => void;
  onCancel: () => void;
  onSuccess: (hasChanges?: boolean) => Promise<void>;
  onReload: () => Promise<void>;
}

function getExclusionReasons(snapshot: ProjectEdit, stages: Pick<ProjectFormValues['stages'][number], 'enabled'>[]) {
  const included = stages.filter((stage) => stage.enabled).length;
  return snapshot.stages.map(({ stage }, index) => {
    if (stage.actualStartDate !== null) return 'Этап фактически начат — исключение запрещено.';
    return included === 1 && stages[index]?.enabled ? 'Нельзя исключить последний включённый этап.' : undefined;
  });
}

export function EditProjectForm({ snapshot, onDirtyChange, onCancel, onSuccess, onReload }: EditProjectFormProperties) {
  const form = useForm<ProjectFormValues>({
    defaultValues: projectEditValues(snapshot),
    resolver: zodResolver(projectEditSchema(snapshot)),
    mode: 'onChange',
    shouldFocusError: false,
  });
  const navigation = useProjectNavigation(form);
  const { screen, stages, step, title, description, registerErrorGroup, revealErrors } = navigation;
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
      else revealErrors();
    },
  });
  const isLocked = update.isPending || update.unavailable || reloading;
  const hasUnfinishedUploads = uploads.documents.some((document) => document.status !== 'uploaded');
  const exclusionReasons = getExclusionReasons(snapshot, stages);

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

  return (
    <FormProvider {...form}>
      <form
        noValidate
        className="flex min-w-0 flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isLocked) void form.handleSubmit(save, revealErrors)(event);
        }}
      >
        <ProjectProgress
          step={step}
          disabled={isLocked}
          label="Шаги редактирования"
          onStepChange={(target) => {
            if (!isLocked) void navigation.selectStep(target);
          }}
        />
        {(update.message || reloadError) && (
          <Alert variant="destructive">
            <AlertDescription>{reloadError || update.message}</AlertDescription>
          </Alert>
        )}
        {update.needsReload && (
          <Alert>
            <AlertDescription>
              Данные изменились на сервере. Ваши правки сохранены в форме. Загрузка актуального снимка сбросит их после
              подтверждения.
              <Button type="button" variant="outline" disabled={isLocked} onClick={() => setConfirmReload(true)}>
                Загрузить актуальные данные
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{title}</h2>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {screen === 'object' && (
              <div className="flex flex-col gap-6">
                <ObjectStep isLocked={isLocked} uploads={uploads} />
                <SavedDocuments
                  fileIds={fileIds}
                  disabled={isLocked}
                  onRemove={(id) => setFileIds((previous) => previous.filter((fileId) => fileId !== id))}
                />
              </div>
            )}
            {screen === 'selection' && (
              <>
                <StagesStep
                  stages={stages}
                  isLocked={isLocked}
                  registerErrorGroup={registerErrorGroup}
                  exclusionReasons={exclusionReasons}
                />
                {Object.entries(update.stageErrors).map(([index, message]) => (
                  <FieldError key={index}>
                    {stages[Number(index)]?.title}: {message}
                  </FieldError>
                ))}
              </>
            )}
            {typeof screen === 'number' && (
              <>
                {form.formState.errors.stages?.[screen]?.message && (
                  <FieldError>{form.formState.errors.stages[screen].message}</FieldError>
                )}
                <StageEditor
                  key={snapshot.stages[screen]?.stage.id}
                  index={screen}
                  disabled={isLocked}
                  checklistReadOnly={snapshot.stages[screen]?.stage.actualStartDate !== null}
                  registerErrorGroup={registerErrorGroup}
                />
              </>
            )}
            {hasUnfinishedUploads && <UnfinishedUploadsWarning />}
          </CardContent>
        </Card>
        <EditActions
          screen={screen}
          isLocked={isLocked}
          hasUnfinishedUploads={hasUnfinishedUploads}
          update={update}
          reloading={reloading}
          onCancel={onCancel}
          navigation={navigation}
        />
      </form>
      <AlertDialog
        open={confirmReload}
        onOpenChange={(open) => {
          if (!reloading) setConfirmReload(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Сбросить правки?</AlertDialogTitle>
            <AlertDialogDescription>
              Форма будет заменена актуальными данными объекта. Ваши правки будут потеряны.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" disabled={reloading} onClick={() => setConfirmReload(false)}>
              Оставить правки
            </Button>
            <Button disabled={reloading} onClick={() => void reload()}>
              Сбросить и загрузить
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormProvider>
  );
}

interface EditActionsProperties {
  screen: 'object' | 'selection' | number;
  isLocked: boolean;
  hasUnfinishedUploads: boolean;
  update: ReturnType<typeof useProjectUpdate>;
  reloading: boolean;
  onCancel: () => void;
  navigation: ReturnType<typeof useProjectNavigation>;
}

function EditActions({
  screen,
  isLocked,
  hasUnfinishedUploads,
  update,
  reloading,
  onCancel,
  navigation,
}: EditActionsProperties) {
  const { nextLabel } = navigation;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
      <Button type="button" variant="outline" disabled={update.isPending || reloading} onClick={onCancel}>
        Отмена
      </Button>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {screen !== 'object' && (
          <Button type="button" variant="outline" disabled={isLocked} onClick={navigation.back}>
            Назад
          </Button>
        )}
        {nextLabel && (
          <Button type="button" variant="outline" disabled={isLocked} onClick={() => void navigation.next()}>
            {nextLabel}
          </Button>
        )}
        <Button type="submit" disabled={isLocked || hasUnfinishedUploads || update.needsReload}>
          {update.isPending && <Spinner data-icon="inline-start" />}
          {update.isPending ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
