import { useId } from 'react';

import { Button } from '@shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@shared/ui/field';
import { Spinner } from '@shared/ui/spinner';
import { Textarea } from '@shared/ui/textarea';

import type { useInvoiceShortages } from '../lib/use-invoice-shortages';
import { MaterialFeedback } from './material-feedback';

interface InvoiceShortageFormProperties {
  editor: ReturnType<typeof useInvoiceShortages>;
  onClose: () => void;
}

export function InvoiceShortageForm({ editor, onClose }: InvoiceShortageFormProperties) {
  const id = useId();
  const { form, action, submit } = editor;
  const error = form.formState.errors.comment;

  return (
    <form onSubmit={(event) => void form.handleSubmit(submit)(event)} className="flex flex-col gap-5">
      <FieldGroup>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor={id}>Каких материалов не хватает?</FieldLabel>
          <Textarea
            {...form.register('comment')}
            id={id}
            maxLength={500}
            rows={4}
            disabled={action.blocked}
            placeholder="Например, не привезли 10 упаковок крепежа"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : `${id}-hint`}
          />
          <p id={`${id}-hint`} className="text-muted-foreground text-xs">
            До 500 символов. Нехватка будет привязана к этому счёту.
          </p>
          {error && <FieldError id={`${id}-error`}>{error.message}</FieldError>}
        </Field>
      </FieldGroup>
      <MaterialFeedback action={action} />
      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" disabled={action.pending} onClick={onClose}>
          Закрыть
        </Button>
        <Button type="submit" disabled={action.blocked}>
          {action.pending && <Spinner data-icon="inline-start" />}Сообщить о нехватке
        </Button>
      </div>
    </form>
  );
}
