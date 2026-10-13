import { ProjectDocument } from '@entities/project';
import { Button } from '@shared/ui/button';

interface SavedDocumentsProperties {
  fileIds: number[];
  disabled: boolean;
  onRemove: (id: number) => void;
}

export function SavedDocuments({ fileIds, disabled, onRemove }: SavedDocumentsProperties) {
  return (
    <section className="flex flex-col gap-3" aria-label="Сохранённые PDF">
      {fileIds.map((id, index) => (
        <div key={id} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <ProjectDocument fileId={id} number={index + 1} />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={`Удалить PDF ${index + 1}`}
            onClick={() => onRemove(id)}
          >
            Удалить
          </Button>
        </div>
      ))}
    </section>
  );
}
