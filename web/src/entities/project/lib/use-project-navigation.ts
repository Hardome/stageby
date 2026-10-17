import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { type FieldPath, type UseFormReturn, useWatch } from 'react-hook-form';

import { projectObjectFields } from '../model/form-data';
import type { ProjectFormValues } from '../model/types';
import { firstErrorPath } from './first-error-path';

type ProjectScreen = 'object' | 'selection' | number;
type StageSummary = Pick<ProjectFormValues['stages'][number], 'type' | 'title' | 'enabled'>;

function screenDetails(screen: ProjectScreen, stages: StageSummary[], selectedIndexes: number[], position: number) {
  if (screen === 'object')
    return {
      step: 1,
      title: 'Объект',
      description: 'Заполните сведения о доме. Поля со звёздочкой обязательны.',
      nextLabel: 'Далее',
    };
  if (screen === 'selection')
    return {
      step: 2,
      title: 'Выбор этапов',
      description: `Включено этапов: ${selectedIndexes.length} из ${stages.length}. Выберите этапы для этого объекта.`,
      nextLabel: 'Заполнить этапы',
    };

  return {
    step: 3,
    title: stages[screen]?.title,
    description:
      `Этап ${position + 1} из ${selectedIndexes.length}. ` +
      'Даты, мастер и планы необязательны. Этап можно заполнить позже.',
    nextLabel: position < selectedIndexes.length - 1 ? 'Следующий этап' : undefined,
  };
}

export function useProjectNavigation(form: UseFormReturn<ProjectFormValues>) {
  const [screen, setScreen] = useState<ProjectScreen>('object');
  const [focusRequest, setFocusRequest] = useState(0);
  const errorGroupReference = useRef<HTMLElement>(null);
  const handledFocusRequest = useRef(0);

  const panelTitleReference = useRef<HTMLHeadingElement>(null);
  const [titleFocusRequest, setTitleFocusRequest] = useState(0);

  const { errors } = form.formState;
  const stages = useWatch({
    control: form.control,
    name: 'stages',
    compute: (values) => values.map(({ type, title, enabled }) => ({ type, title, enabled })),
  });
  const selectedIndexes = stages.flatMap((stage, index) => (stage.enabled ? [index] : []));
  const position = typeof screen === 'number' ? stages.slice(0, screen).filter((stage) => stage.enabled).length : -1;
  const nextIndex = selectedIndexes[position + 1];
  const previousIndex = selectedIndexes[position - 1];
  const registerErrorGroup = useCallback((element: HTMLElement | null) => {
    errorGroupReference.current = element;
  }, []);

  useLayoutEffect(() => {
    if (titleFocusRequest === 0) return;

    panelTitleReference.current?.focus({ preventScroll: true });
  }, [titleFocusRequest]);

  useLayoutEffect(() => {
    if (focusRequest === handledFocusRequest.current) return;
    handledFocusRequest.current = focusRequest;
    // Переводим фокус после отображения нужного экрана и регистрации его полей.
    const field =
      typeof screen === 'number'
        ? firstErrorPath(errors.stages?.[screen], `stages.${screen}`)
        : projectObjectFields.find((name) => errors[name]);
    if (screen === 'selection' || field?.endsWith('.checklistItems')) errorGroupReference.current?.focus();
    else if (field) form.setFocus(field as FieldPath<ProjectFormValues>);
  }, [focusRequest, screen, form, errors]);

  function focusError() {
    setFocusRequest((request) => request + 1);
  }

  function moveTo(target: ProjectScreen) {
    setScreen(target);
    const shouldReduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: shouldReduceMotion ? 'auto' : 'smooth' });
  }

  function revealErrors() {
    const hasObjectError = projectObjectFields.some((field) => form.getFieldState(field).invalid);
    if (hasObjectError) moveTo('object');
    else {
      const firstStageError = form
        .getValues('stages')
        .findIndex((stage, index) => stage.enabled && form.getFieldState(`stages.${index}`).invalid);
      moveTo(firstStageError === -1 ? 'selection' : firstStageError);
    }
    focusError();
  }

  async function selectStep(target: number) {
    if (target === 1) {
      moveTo('object');

      return;
    }
    if (!(await form.trigger([...projectObjectFields]))) {
      moveTo('object');
      focusError();

      return;
    }
    if (target === 2) {
      moveTo('selection');

      return;
    }
    const firstIndex = selectedIndexes[0];
    if (firstIndex === undefined) {
      moveTo('selection');
      form.setError('stages', { type: 'manual', message: 'Включите хотя бы один этап.' });
      focusError();
    } else if (typeof screen !== 'number') moveTo(firstIndex);
  }

  async function next() {
    if (screen === 'object') return selectStep(2);
    if (screen === 'selection') return selectStep(3);
    if (nextIndex === undefined) return;
    if (await form.trigger(`stages.${screen}`)) moveTo(nextIndex);
    else focusError();
  }

  async function selectStage(index: number) {
    if (!form.getValues(`stages.${index}`)?.enabled) return;

    if (screen === 'object' && !(await form.trigger([...projectObjectFields]))) {
      moveTo('object');
      focusError();

      return;
    }

    moveTo(index);
    setTitleFocusRequest((request) => request + 1);
  }

  return {
    screen,
    stages,
    registerErrorGroup,
    panelTitleReference,
    navigationStages: selectedIndexes.map((index) => ({
      index,
      title: stages[index]?.title ?? '',
      hasError: firstErrorPath(errors.stages?.[index]) !== undefined,
    })),
    currentStage: typeof screen === 'number' ? screen : undefined,
    ...screenDetails(screen, stages, selectedIndexes, position),
    next,
    selectStep,
    selectStage,
    revealErrors,
    showObject: () => moveTo('object'),
    showStage: (index: number) => moveTo(index),
    back: () => moveTo(screen === 'selection' ? 'object' : (previousIndex ?? 'selection')),
  };
}
