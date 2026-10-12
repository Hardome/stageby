import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm } from 'react-hook-form';

import { useAccessError } from '@shared/lib/hooks';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { FieldDescription } from '@shared/ui/field';

import type { ActiveStageType } from '@api/types';

import { projectFormSchema } from '../lib/project-form';
import { useDocuments } from '../lib/use-documents';
import { useProjectNavigation } from '../lib/use-project-navigation';
import { useProjectSubmission } from '../lib/use-project-submission';
import { initialProjectForm } from '../model/data';
import type { ProjectFormValues } from '../model/types';
import { ProjectActions } from './project-actions';
import { ProjectProgress } from './project-progress';
import { ProjectStep, UnfinishedUploadsWarning } from './project-steps';

interface CreateProjectFormProperties {
  types: ActiveStageType[];
  onDirtyChange: (isDirty: boolean) => void;
  onCancel: () => void;
  onSuccess: () => Promise<void>;
}

export function CreateProjectForm({ types, onDirtyChange, onCancel, onSuccess }: CreateProjectFormProperties) {
  const form = useForm<ProjectFormValues>({
    defaultValues: initialProjectForm(types),
    resolver: zodResolver(projectFormSchema),
    mode: 'onChange',
  });

  const navigation = useProjectNavigation(form);
  const { screen, stages, step, title, description, nextLabel, revealErrors, focusErrors, registerErrorGroup, back } =
    navigation;
  const accessError = useAccessError();
  const uploads = useDocuments({ onAccessError: accessError });

  const isDirty = form.formState.isDirty || uploads.documents.length > 0;

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const submission = useProjectSubmission({
    form,
    onSuccess,
    onInvalid: (isFileError) => {
      if (isFileError) navigation.showObject();
      else revealErrors();
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
      uploads.documents.flatMap((document) => (document.fileId ? [document.fileId] : [])),
    );
  }

  return (
    <FormProvider {...form}>
      <form
        ref={focusErrors}
        noValidate
        className="flex min-w-0 flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (screen === 'object') next();
          else if (submission.hasSnapshot) void save(form.getValues());
          else void form.handleSubmit(save, () => requestAnimationFrame(revealErrors))(event);
        }}
      >
        <ProjectProgress
          step={step}
          disabled={isLocked}
          onStepChange={(target) => {
            if (!isLocked) void navigation.selectStep(target);
          }}
        />
        {submission.message && (
          <Alert variant="destructive">
            <AlertDescription>{submission.message}</AlertDescription>
          </Alert>
        )}
        {submission.hasSnapshot && !submission.isPending && !submission.hasConflict && (
          <FieldDescription>
            Сохраняется исходный запрос. Повтор безопасен: второй объект не будет создан.
          </FieldDescription>
        )}
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{title}</h2>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectStep
              screen={screen}
              stages={stages}
              isLocked={isLocked}
              uploads={uploads}
              registerErrorGroup={registerErrorGroup}
            />
            {screen !== 'object' && hasUnfinishedUploads && <UnfinishedUploadsWarning />}
          </CardContent>
        </Card>
        <ProjectActions
          canCreate={screen !== 'object'}
          hasBack={screen !== 'object'}
          nextLabel={nextLabel}
          onNext={next}
          isPending={submission.isPending}
          isLocked={isLocked}
          hasSnapshot={submission.hasSnapshot}
          hasConflict={submission.hasConflict}
          hasUnfinishedUploads={hasUnfinishedUploads}
          onCancel={onCancel}
          onBack={back}
        />
      </form>
    </FormProvider>
  );
}
