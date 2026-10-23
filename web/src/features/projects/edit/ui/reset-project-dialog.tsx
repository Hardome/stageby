import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@shared/ui/alert-dialog';
import { Button } from '@shared/ui/button';

interface ResetProjectDialogProperties {
  isOpen: boolean;
  reloading: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
}

export function ResetProjectDialog({
  isOpen,
  reloading,
  onOpenChange,
  onConfirm,
}: Readonly<ResetProjectDialogProperties>) {
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(value) => {
        if (!reloading) onOpenChange(value);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Сбросить правки?</AlertDialogTitle>
          <AlertDialogDescription>
            Форма будет заменена актуальными данными объекта. Ваши правки будут потеряны.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" disabled={reloading} onClick={() => onOpenChange(false)}>
            Оставить правки
          </Button>
          <Button disabled={reloading} onClick={onConfirm}>
            Сбросить и загрузить
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
