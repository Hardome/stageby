import { Trash2Icon } from 'lucide-react';

import { ProjectDocument } from '@entities/project';
import { Button } from '@shared/ui/button';

interface SavedDocumentsProperties {
  fileIds: number[];
  disabled: boolean;
  onRemove: (id: number) => void;
}

export function SavedDocuments({ fileIds, disabled, onRemove }: SavedDocumentsProperties) {
  return (
    <section className="flex flex-col gap-2" aria-label="Сохранённые PDF">
      {fileIds.map((id, index) => (
        <ProjectDocument
          key={id}
          fileId={id}
          number={index + 1}
          action={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              aria-label={`Удалить PDF ${index + 1}`}
              title={`Удалить PDF ${index + 1}`}
              onClick={() => onRemove(id)}
            >
              <Trash2Icon />
            </Button>
          }
        />
      ))}
    </section>
  );
}
