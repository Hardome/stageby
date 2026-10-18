import { z } from 'zod';

import type { UpdateProject } from '#app/generated/types.gen';
import {
  zConfigureChecklist,
  zCoordinates,
  zCreateAdditionalStage,
  zCreateProjectChecklistItem,
  zUpdateProjectBody,
  zUpdateProjectStage,
} from '#app/generated/zod.gen';

const checklist = zConfigureChecklist
  .extend({ items: zConfigureChecklist.shape.items.element.strict().array().min(1) })
  .strict();
const stage = zUpdateProjectStage.extend({ checklist: checklist.optional() }).strict();
const additional = zCreateAdditionalStage
  .extend({ checklistItems: zCreateProjectChecklistItem.strict().array().min(1) })
  .strict();

function normalize(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value);
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, normalize(item)]),
    );
  return value;
}

export const updateProjectBody = zUpdateProjectBody
  .extend({
    coordinates: zCoordinates.strict().optional(),
    stages: stage.array().max(9).optional(),
    additionalStage: additional.optional(),
  })
  .strict()
  .superRefine((body, context) => {
    if (Object.entries(body).filter(([key, value]) => key !== 'expectedVersion' && value !== undefined).length === 0)
      context.addIssue({ code: 'custom', message: 'Нужно передать хотя бы одно изменение.' });
    function validate(value: unknown, path: (string | number)[]) {
      if (typeof value === 'string' && !value.trim())
        context.addIssue({ code: 'custom', path, message: 'Поле не может состоять из пробелов.' });
      if (typeof value === 'bigint' && (value > BigInt(Number.MAX_SAFE_INTEGER) || value < 0n || value % 100n !== 0n))
        context.addIssue({
          code: 'custom',
          path,
          message: 'Сумма должна быть безопасным целым числом и кратна 100 копейкам.',
        });
      if (Array.isArray(value)) value.forEach((item, index) => validate(item, [...path, index]));
      else if (value !== null && typeof value === 'object')
        for (const [key, item] of Object.entries(value)) validate(item, [...path, key]);
    }
    validate(body, []);
  })
  .transform((body) => normalize(body) as UpdateProject);
