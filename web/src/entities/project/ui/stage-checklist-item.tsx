import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from 'lucide-react';

import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { FieldGroup, FieldSet } from '@shared/ui/field';

import { ProjectField } from './project-field';

interface StageChecklistItemProperties {
  stageIndex: number;
  itemIndex: number;
  itemCount: number;
  disabled: boolean;
  readOnly: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

export function StageChecklistItem({
  stageIndex,
  itemIndex,
  itemCount,
  disabled,
  readOnly,
  onMove,
  onRemove,
}: StageChecklistItemProperties) {
  return (
    <FieldSet className="min-w-0 rounded-(--radius-card) border p-4">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="secondary">Пункт {itemIndex + 1}</Badge>
        <div className="flex gap-1">
          {!readOnly && (
            <>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={disabled || itemIndex === 0}
                aria-label={`Поднять пункт ${itemIndex + 1}`}
                onClick={() => onMove(itemIndex, itemIndex - 1)}
              >
                <ArrowUpIcon />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={disabled || itemIndex === itemCount - 1}
                aria-label={`Опустить пункт ${itemIndex + 1}`}
                onClick={() => onMove(itemIndex, itemIndex + 1)}
              >
                <ArrowDownIcon />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                disabled={disabled}
                aria-label={`Удалить пункт ${itemIndex + 1}`}
                onClick={() => onRemove(itemIndex)}
              >
                <Trash2Icon />
              </Button>
            </>
          )}
        </div>
      </div>
      <FieldGroup className="grid min-w-0 gap-4 md:grid-cols-2">
        <ProjectField
          name={`stages.${stageIndex}.checklistItems.${itemIndex}.title`}
          label="Название пункта"
          required
          maxLength={500}
          disabled={disabled || readOnly}
        />
        <ProjectField
          name={`stages.${stageIndex}.checklistItems.${itemIndex}.photoHint`}
          label="Подсказка к фотографии"
          maxLength={1000}
          disabled={disabled || readOnly}
        />
      </FieldGroup>
    </FieldSet>
  );
}
