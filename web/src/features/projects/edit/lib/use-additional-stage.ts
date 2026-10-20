import type { UseFormReturn } from 'react-hook-form';

import type { ProjectFormValues, useProjectNavigation } from '@entities/project';

import { emptyAdditionalStage } from './additional-stage';

export function useAdditionalStage(
  form: UseFormReturn<ProjectFormValues>,
  navigation: ReturnType<typeof useProjectNavigation>,
  isNewStage: boolean,
) {
  const additional = navigation.stages.find((stage) => stage.type === 'additional');
  const canAdd = !additional?.enabled;

  function add() {
    const stages = form.getValues('stages');
    const index = stages.findIndex((stage) => stage.type === 'additional');
    if (index !== -1 && stages[index]?.enabled) return;

    const nextStages = [...stages];
    const additionalIndex = index === -1 ? stages.length : index;
    nextStages[additionalIndex] = emptyAdditionalStage();
    form.setValue('stages', nextStages, { shouldDirty: true });

    navigation.showStage(additionalIndex);
  }

  function remove() {
    if (!isNewStage) return;

    const stages = form.getValues('stages');
    const index = stages.findIndex((stage) => stage.type === 'additional');
    if (index === -1) return;

    form.setValue(
      'stages',
      stages.filter((stage) => stage.type !== 'additional'),
      { shouldDirty: true },
    );
    form.clearErrors(`stages.${index}`);
    navigation.showSelection();
  }

  const canRemove =
    isNewStage &&
    additional?.enabled === true &&
    typeof navigation.screen === 'number' &&
    navigation.stages[navigation.screen]?.type === 'additional';

  return { canAdd, add, canRemove, remove };
}
