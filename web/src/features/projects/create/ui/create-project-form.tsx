import { FormProvider } from 'react-hook-form';

import { ProjectFormPanel, ProjectProgress, ProjectStep, UnfinishedUploadsWarning } from '@entities/project';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { FieldDescription } from '@shared/ui/field';

import { useProjectCreationForm } from '../lib/use-project-creation-form';
import type { CreateProjectFormProperties } from '../model/types';
import { ProjectActions } from './project-actions';

export function CreateProjectForm(properties: CreateProjectFormProperties) {
  const { form, navigation, uploads, submission, isLocked, hasUnfinishedUploads, next, submit } =
    useProjectCreationForm(properties);
  const { screen, stages, step, title, description, nextLabel, registerErrorGroup, back } = navigation;

  return (
    <FormProvider {...form}>
      <form noValidate className="grid min-w-0 gap-4 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-5" onSubmit={submit}>
        <ProjectProgress
          step={step}
          stages={navigation.navigationStages}
          currentStage={navigation.currentStage}
          onStageChange={(index) => {
            if (!isLocked) void navigation.selectStage(index);
          }}
          disabled={isLocked}
          onStepChange={(target) => {
            if (!isLocked) void navigation.selectStep(target);
          }}
        />
        <div className="flex min-w-0 flex-col gap-4">
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
          <ProjectFormPanel
            titleRef={navigation.panelTitleReference}
            step={step}
            title={title}
            description={description}
            actions={
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
                onCancel={properties.onCancel}
                onBack={back}
              />
            }
          >
            <ProjectStep
              screen={screen}
              stages={stages}
              isLocked={isLocked}
              uploads={uploads}
              registerErrorGroup={registerErrorGroup}
            />
            {screen !== 'object' && hasUnfinishedUploads && <UnfinishedUploadsWarning />}
          </ProjectFormPanel>
        </div>
      </form>
    </FormProvider>
  );
}
