import type { UseFormReturn } from 'react-hook-form';

import type { ProjectFormValues, useProjectNavigation } from '@entities/project';

import { emptyAdditionalStage } from './additional-stage';

export function useAdditionalStage(
  form: UseFormReturn<ProjectFormValues>,
  navigation: ReturnType<typeof useProjectNavigation>,
) {
  const additional = navigation.stages.find((stage) => stage.type === 'additional');
  const canAdd = typeof navigation.screen === 'number' && !navigation.nextLabel && !additional?.enabled;

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

  return { canAdd, add };
}
