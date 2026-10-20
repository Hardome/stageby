import { FormProvider } from 'react-hook-form';

import { ProjectFormPanel, ProjectProgress, UnfinishedUploadsWarning } from '@entities/project';

import { useProjectEditForm } from '../lib/use-project-edit-form';
import type { EditProjectFormProperties } from '../model/types';
import { AdditionalStageAction } from './additional-stage-action';
import { EditActions } from './edit-actions';
import { EditProjectFeedback } from './edit-project-feedback';
import { EditProjectFields } from './edit-project-fields';
import { ResetProjectDialog } from './reset-project-dialog';

export function EditProjectForm(properties: EditProjectFormProperties) {
  const editor = useProjectEditForm(properties);
  const { form, navigation, update, isLocked, hasUnfinishedUploads, reloading } = editor;
  const { step, title, description } = navigation;

  return (
    <FormProvider {...form}>
      <form
        noValidate
        className="grid min-w-0 gap-4 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isLocked) void form.handleSubmit(editor.save, navigation.revealErrors)(event);
        }}
      >
        <div className="flex w-full min-w-0 flex-col gap-3 self-start lg:sticky lg:top-6">
          <ProjectProgress
            step={step}
            stages={navigation.navigationStages}
            currentStage={navigation.currentStage}
            onStageChange={(index) => {
              if (!isLocked) void navigation.selectStage(index);
            }}
            disabled={isLocked}
            label="Шаги редактирования"
            onStepChange={(target) => {
              if (!isLocked) void navigation.selectStep(target);
            }}
          />
          {editor.additionalStage.canAdd && (
            <AdditionalStageAction disabled={isLocked} onAdd={editor.additionalStage.add} />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <EditProjectFeedback
            message={editor.reloadError || update.message}
            needsReload={update.needsReload}
            disabled={isLocked}
            onReload={() => editor.setConfirmReload(true)}
          />
          <ProjectFormPanel
            titleRef={navigation.panelTitleReference}
            step={step}
            title={title}
            description={description}
            actions={
              <EditActions
                screen={navigation.screen}
                isLocked={isLocked}
                hasUnfinishedUploads={hasUnfinishedUploads}
                update={update}
                reloading={reloading}
                onCancel={properties.onCancel}
                navigation={navigation}
                canRemoveAdditionalStage={editor.additionalStage.canRemove}
                onRemoveAdditionalStage={editor.additionalStage.remove}
              />
            }
          >
            <EditProjectFields snapshot={properties.snapshot} editor={editor} />
            {hasUnfinishedUploads && <UnfinishedUploadsWarning />}
          </ProjectFormPanel>
        </div>
      </form>
      <ResetProjectDialog
        isOpen={editor.confirmReload}
        reloading={reloading}
        onOpenChange={editor.setConfirmReload}
        onConfirm={() => void editor.reload()}
      />
    </FormProvider>
  );
}
