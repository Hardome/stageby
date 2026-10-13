import { ObjectStep, StageEditor, StagesStep } from '@entities/project';
import { FieldError } from '@shared/ui/field';

import type { ProjectEdit } from '@api/types';

import type { useProjectEditForm } from '../lib/use-project-edit-form';
import { AdditionalStageAction } from './additional-stage-action';
import { SavedDocuments } from './saved-documents';

interface EditProjectFieldsProperties {
  snapshot: ProjectEdit;
  editor: ReturnType<typeof useProjectEditForm>;
}

export function EditProjectFields({ snapshot, editor }: EditProjectFieldsProperties) {
  const { form, navigation, uploads, fileIds, removeDocument, isLocked, exclusionReasons, update } = editor;
  const { screen, stages, registerErrorGroup } = navigation;
  if (screen === 'object')
    return (
      <ObjectStep isLocked={isLocked} uploads={uploads}>
        <SavedDocuments fileIds={fileIds} disabled={isLocked} onRemove={removeDocument} />
      </ObjectStep>
    );
  if (screen === 'selection')
    return (
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
    );

  return (
    <>
      {form.formState.errors.stages?.[screen]?.message && (
        <FieldError>{form.formState.errors.stages[screen].message}</FieldError>
      )}
      <StageEditor
        key={snapshot.stages[screen]?.stage.id ?? stages[screen]?.type}
        index={screen}
        disabled={isLocked}
        checklistReadOnly={Boolean(snapshot.stages[screen]?.stage.actualStartDate)}
        registerErrorGroup={registerErrorGroup}
      />
      {editor.additionalStage.canAdd && (
        <AdditionalStageAction
          disabled={isLocked}
          isRestoring={editor.additionalStage.isRestoring}
          onAdd={editor.additionalStage.add}
        />
      )}
    </>
  );
}
