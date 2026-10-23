import { useId } from 'react';

import { useWatch } from 'react-hook-form';

import { Button } from '@shared/ui/button';
import { DialogBody, DialogFooter } from '@shared/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@shared/ui/field';
import { Spinner } from '@shared/ui/spinner';
import { Textarea } from '@shared/ui/textarea';

import type { useInvoiceShortages } from '../lib/use-invoice-shortages';
import { MaterialFeedback } from './material-feedback';

interface InvoiceShortageFormProperties {
  editor: ReturnType<typeof useInvoiceShortages>;
  onClose: () => void;
}

export function InvoiceShortageForm({ editor, onClose }: Readonly<InvoiceShortageFormProperties>) {
  const id = useId();
  const { form, action, submit } = editor;
  const comment = useWatch({ control: form.control, name: 'comment' });
  const error = form.formState.errors.comment;

  return (
    <form onSubmit={(event) => void form.handleSubmit(submit)(event)} className="flex min-h-0 flex-1 flex-col">
      <DialogBody>
        <FieldGroup>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={id}>Каких материалов не хватает?</FieldLabel>
            <Textarea
              {...form.register('comment')}
              id={id}
              maxLength={500}
              rows={4}
              className="max-sm:min-h-48"
              disabled={action.blocked}
              placeholder="Например, не привезли 10 упаковок крепежа"
              aria-invalid={Boolean(error)}
              aria-describedby={[`${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ')}
            />
            <p id={`${id}-hint`} className="text-right text-xs text-muted-foreground tabular-nums">
              {comment?.length ?? 0} / 500
            </p>
            {error && <FieldError id={`${id}-error`}>{error.message}</FieldError>}
          </Field>
        </FieldGroup>
        <MaterialFeedback action={action} />
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={action.pending} onClick={onClose}>
          Отмена
        </Button>
        <Button type="submit" disabled={action.blocked}>
          {action.pending && <Spinner data-icon="inline-start" />}Сообщить
        </Button>
      </DialogFooter>
    </form>
  );
}
