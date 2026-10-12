import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon } from 'lucide-react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';

import { useAccessError } from '@shared/lib/hooks';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { FieldDescription } from '@shared/ui/field';

import type { ActiveStageType } from '@api/types';

import { projectFormSchema } from '../lib/project-form';
import { useDocuments } from '../lib/use-documents';
import { useProjectSubmission } from '../lib/use-project-submission';
import { initialProjectForm, projectObjectFields } from '../model/data';
import type { ProjectFormValues } from '../model/types';
import { ProjectActions } from './project-actions';
import { ObjectStep, StagesStep } from './project-steps';

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

  const [step, setStep] = useState(1);
  const [opened, setOpened] = useState<string[]>([]);
  const accessError = useAccessError();
  const uploads = useDocuments({ onAccessError: accessError });

  const isDirty = form.formState.isDirty || uploads.documents.length > 0;

  useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);

  const stages = useWatch({
    control: form.control,
    name: 'stages',
    compute: (values) => values.map(({ type, title, enabled }) => ({ type, title, enabled })),
  });

  const submission = useProjectSubmission({
    form,
    onSuccess,
    onInvalid: (isFileError) => {
      if (isFileError) setStep(1);
      else revealErrors();
    },
  });

  const isLocked = submission.isPending || submission.hasSnapshot;
  const hasUnfinishedUploads = uploads.documents.some((document) => document.status !== 'uploaded');

  function revealErrors() {
    const firstObjectError = projectObjectFields.find((field) => form.getFieldState(field).invalid);
    if (firstObjectError) {
      setStep(1);
      requestAnimationFrame(() => form.setFocus(firstObjectError));
      return;
    }
    setStep(2);
    setOpened(
      form
        .getValues('stages')
        .filter((_, index) => form.getFieldState(`stages.${index}`).invalid)
        .map((stage) => stage.type),
    );
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>('input[aria-invalid="true"], button[aria-invalid="true"]')?.focus(),
    );
  }

  async function next() {
    if (!(await form.trigger([...projectObjectFields], { shouldFocus: true }))) return;
    setStep(2);
    setOpened((previous) => (previous.length > 0 ? previous : [stages.find((stage) => stage.enabled)?.type ?? '']));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(values: ProjectFormValues) {
    if (hasUnfinishedUploads) return;
    await submission.save(
      values,
      uploads.documents.flatMap((document) => (document.fileId ? [document.fileId] : [])),
    );
  }

  const description =
    step === 1
      ? 'Заполните сведения о доме. Поля со звёздочкой обязательны.'
      : `Включено этапов: ${stages.filter((stage) => stage.enabled).length} из ${stages.length}. ` +
        'Укажите даты каждого этапа вручную.';

  return (
    <FormProvider {...form}>
      <form
        noValidate
        className="flex min-w-0 flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (step === 1) void next();
          else if (submission.hasSnapshot) void save(form.getValues());
          else void form.handleSubmit(save, () => requestAnimationFrame(revealErrors))(event);
        }}
      >
        <ol className="flex gap-3" aria-label="Шаги создания">
          {['Объект', 'Этапы и сроки'].map((label, index) => (
            <li
              key={label}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border p-3"
              aria-current={step === index + 1 ? 'step' : undefined}
            >
              <Badge variant={step === index + 1 ? 'default' : 'secondary'}>
                {step > index + 1 ? <CheckIcon /> : index + 1}
              </Badge>
              <span className="text-sm">{label}</span>
            </li>
          ))}
        </ol>
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
              <h2>{step === 1 ? 'Объект' : 'Этапы и сроки'}</h2>
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <ObjectStep isLocked={isLocked} uploads={uploads} />
            ) : (
              <StagesStep
                stages={stages}
                opened={opened}
                onOpenedChange={setOpened}
                isLocked={isLocked}
                hasUnfinishedUploads={hasUnfinishedUploads}
              />
            )}
          </CardContent>
        </Card>
        <ProjectActions
          step={step}
          isPending={submission.isPending}
          isLocked={isLocked}
          hasSnapshot={submission.hasSnapshot}
          hasConflict={submission.hasConflict}
          hasUnfinishedUploads={hasUnfinishedUploads}
          onCancel={onCancel}
          onBack={() => setStep(1)}
        />
      </form>
    </FormProvider>
  );
}
