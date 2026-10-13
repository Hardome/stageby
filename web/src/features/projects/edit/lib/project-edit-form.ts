import type { z } from 'zod';

import { type ProjectFormValues, parseAmount, parseCoordinates, projectFormSchema } from '@entities/project';

import type { ProjectEdit, ProjectEditStage, UpdateProject, UpdateProjectStage } from '@api/types';

function amountInput(value: bigint | null): string {
  return value === null ? '' : (value / 100n).toString();
}

export function projectEditValues(snapshot: ProjectEdit): ProjectFormValues {
  const { project } = snapshot;

  return {
    ownerName: project.ownerName,
    address: project.address,
    coordinates: `${project.coordinates.latitude}, ${project.coordinates.longitude}`,
    plannedStartDate: project.plannedStartDate,
    plannedEndDate: project.plannedEndDate,
    stages: snapshot.stages.map(({ stage, checklist }) => ({
      type: stage.type,
      title: stage.title,
      enabled: stage.isIncluded,
      plannedStartDate: stage.plannedStartDate ?? '',
      plannedEndDate: stage.plannedEndDate ?? '',
      assigneeId: stage.assignee?.id ?? null,
      assigneeName: stage.assignee?.fullName ?? '',
      plannedWorkAmount: amountInput(stage.plannedWorkAmountMinor),
      plannedMaterialAmount: amountInput(stage.plannedMaterialAmountMinor),
      checklistItems: checklist.items.map((item) => ({ title: item.title, photoHint: item.photoHint ?? '' })),
    })),
  };
}

function validateStage(
  entry: ProjectEditStage,
  value: ProjectFormValues['stages'][number],
  index: number,
  context: z.RefinementCtx,
) {
  if (!value.enabled && entry.stage.isIncluded && entry.stage.actualStartDate !== null)
    context.addIssue({ code: 'custom', path: ['stages', index], message: 'Начатый этап нельзя исключить.' });
  if (entry.stage.status !== 'paid' || !value.enabled) return;
  try {
    const plan = parseAmount(value.plannedWorkAmount);
    if (plan === null || plan > entry.stage.actualWorkAmountMinor)
      context.addIssue({
        code: 'custom',
        path: ['stages', index, 'plannedWorkAmount'],
        message: 'У выплаченного этапа план работ обязателен и не может превышать факт выплат.',
      });
  } catch {
    // Некорректную сумму показывает общая схема поля.
  }
}

export function projectEditSchema(snapshot: ProjectEdit) {
  return projectFormSchema.superRefine((values, context) => {
    for (const [index, entry] of snapshot.stages.entries()) {
      const value = values.stages[index];
      if (value) validateStage(entry, value, index, context);
    }
  });
}

function checklistItems(value: ProjectFormValues['stages'][number]) {
  return value.checklistItems.map((item) => ({ title: item.title.trim(), photoHint: item.photoHint.trim() || null }));
}

function stageChange(
  entry: ProjectEditStage,
  value: ProjectFormValues['stages'][number],
  before: ProjectFormValues['stages'][number],
): UpdateProjectStage {
  const change: UpdateProjectStage = { id: entry.stage.id, expectedVersion: entry.stage.version };
  if (value.enabled !== before.enabled) change.isIncluded = value.enabled;
  if (!value.enabled) return change;
  for (const name of ['plannedStartDate', 'plannedEndDate'] as const)
    if (value[name] !== before[name]) change[name] = value[name] || null;
  if (value.assigneeId !== before.assigneeId) change.assigneeId = value.assigneeId;
  const work = parseAmount(value.plannedWorkAmount);
  const material = parseAmount(value.plannedMaterialAmount);
  if (work !== entry.stage.plannedWorkAmountMinor) change.plannedWorkAmountMinor = work;
  if (material !== entry.stage.plannedMaterialAmountMinor) change.plannedMaterialAmountMinor = material;
  const items = checklistItems(value);
  if (entry.stage.actualStartDate === null && JSON.stringify(items) !== JSON.stringify(checklistItems(before)))
    change.checklist = { expectedVersion: entry.checklist.version, items };

  return change;
}

export function projectEditRequest(snapshot: ProjectEdit, values: ProjectFormValues, fileIds: number[]): UpdateProject {
  const original = projectEditValues(snapshot);
  const body: UpdateProject = { expectedVersion: snapshot.project.version };
  for (const name of ['ownerName', 'address', 'plannedStartDate', 'plannedEndDate'] as const) {
    const value = values[name].trim();
    if (value !== original[name]) body[name] = value;
  }
  const coordinates = parseCoordinates(values.coordinates);
  if (!coordinates) throw new Error('Некорректные координаты.');
  if (
    coordinates.latitude !== snapshot.project.coordinates.latitude ||
    coordinates.longitude !== snapshot.project.coordinates.longitude
  )
    body.coordinates = coordinates;
  if (
    fileIds.length !== snapshot.project.documentFileIds.length ||
    fileIds.some((id, index) => id !== snapshot.project.documentFileIds[index])
  )
    body.documentFileIds = fileIds;
  const changes = snapshot.stages.flatMap((entry, index) => {
    const value = values.stages[index];
    const before = original.stages[index];
    if (!value || !before) throw new Error('Состав этапов изменился. Загрузите актуальную форму.');
    const change = stageChange(entry, value, before);

    return Object.keys(change).length > 2 ? [change] : [];
  });
  if (changes.length > 0) body.stages = changes;

  return body;
}

export function editErrorPath(path: string, body: UpdateProject, snapshot: ProjectEdit): string | undefined {
  let result = path.replace(/^body\.?/, '');
  const match = /^stages\.(\d+)(\..*)?$/.exec(result);
  if (match) {
    const id = body.stages?.[Number(match[1])]?.id;
    const index = snapshot.stages.findIndex((entry) => entry.stage.id === id);
    if (index === -1) return;
    result = `stages.${index}${match[2] ?? ''}`;
  }
  result = result
    .replace('.checklist.items', '.checklistItems')
    .replace(/\.checklist(?:\.expectedVersion)?$/, '.checklistItems')
    .replace('plannedWorkAmountMinor', 'plannedWorkAmount')
    .replace('plannedMaterialAmountMinor', 'plannedMaterialAmount')
    .replace(/\.isIncluded$/, '.enabled');

  return result.startsWith('coordinates') ? 'coordinates' : result;
}
