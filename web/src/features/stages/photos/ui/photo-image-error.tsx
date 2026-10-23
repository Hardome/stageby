import { Button } from '@shared/ui/button';

interface PhotoImageErrorProperties {
  onRetry: () => void;
}

export function PhotoImageError({ onRetry }: Readonly<PhotoImageErrorProperties>) {
  return (
    <div className="flex flex-col items-center gap-2 p-3" role="alert">
      <p className="text-sm">Не удалось открыть фото.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Повторить
      </Button>
    </div>
  );
}
