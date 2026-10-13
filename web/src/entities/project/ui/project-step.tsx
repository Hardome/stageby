import { useFormContext } from 'react-hook-form';

import { FieldError } from '@shared/ui/field';

import type { useDocuments } from '../lib/use-documents';
import type { ProjectFormValues } from '../model/types';
import { ObjectStep } from './object-step';
import { StageEditor } from './stage-editor';
import { StagesStep } from './stages-step';

interface ProjectStepProperties {
  screen: 'object' | 'selection' | number;
  stages: Pick<ProjectFormValues['stages'][number], 'type' | 'title' | 'enabled'>[];
  isLocked: boolean;
  uploads: ReturnType<typeof useDocuments>;
  registerErrorGroup: (element: HTMLElement | null) => void;
}

export function ProjectStep({ screen, stages, isLocked, uploads, registerErrorGroup }: ProjectStepProperties) {
  const {
    formState: { errors },
  } = useFormContext<ProjectFormValues>();
  if (screen === 'object') return <ObjectStep isLocked={isLocked} uploads={uploads} />;
  if (screen === 'selection')
    return <StagesStep stages={stages} isLocked={isLocked} registerErrorGroup={registerErrorGroup} />;

  return (
    <>
      {errors.stages?.[screen]?.message && <FieldError>{errors.stages[screen].message}</FieldError>}
      <StageEditor
        key={stages[screen]?.type}
        index={screen}
        disabled={isLocked}
        registerErrorGroup={registerErrorGroup}
      />
    </>
  );
}
