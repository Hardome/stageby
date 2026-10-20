import { Button } from '@shared/ui/button';
import { Field, FieldGroup, FieldLabel } from '@shared/ui/field';
import { Skeleton } from '@shared/ui/skeleton';

export function UserEditorSkeleton({ mode }: { mode: 'edit' | 'password' }) {
  const isPassword = mode === 'password';
  const labels = isPassword ? ['Новый пароль', 'Повторите пароль'] : ['Полное имя', 'Роль', 'Телефон (необязательно)'];

  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      {isPassword && <Skeleton className="h-6 w-56 max-w-full" />}
      <FieldGroup>
        {labels.map((label) => (
          <Field key={label}>
            <FieldLabel>{label}</FieldLabel>
            <Skeleton className="h-12 w-full" />
          </Field>
        ))}
        {!isPassword && (
          <div className="flex items-center gap-2">
            <Skeleton className="size-4" />
            <span className="text-sm">Активный пользователь</span>
          </div>
        )}
      </FieldGroup>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="success" disabled>
          {isPassword ? 'Сменить пароль' : 'Сохранить'}
        </Button>
        <Button variant="outline" disabled>
          Отмена
        </Button>
      </div>
    </div>
  );
}
