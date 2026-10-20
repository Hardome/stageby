import { useEffect, useRef } from 'react';

import { SlidersHorizontalIcon, XIcon } from 'lucide-react';
import { Controller, FormProvider } from 'react-hook-form';

import { AssigneePicker } from '@entities/user';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { DialogBody, DialogClose, DialogContent, DialogFooter, DialogTitle } from '@shared/ui/dialog';
import { FieldGroup } from '@shared/ui/field';

import type { Stage } from '@api/types';

import { useStageForm } from '../lib/use-stage-form';
import { StageParameterField } from './stage-parameter-field';

interface StageParametersProperties {
  stage: Stage;
  focusAssignee?: boolean;
  onClose: () => void;
  onPendingChange: (isPending: boolean) => void;
}

export function StageParameters({ stage, focusAssignee = false, onClose, onPendingChange }: StageParametersProperties) {
  const editor = useStageForm(stage, onClose);
  const assigneeReference = useRef<HTMLInputElement>(null);
  const isDisabled =
    editor.pending || editor.unavailable || editor.needsReload || stage.projectIsArchived || !stage.isIncluded;

  useEffect(() => {
    onPendingChange(editor.pending);

    return () => onPendingChange(false);
  }, [editor.pending, onPendingChange]);

  return (
    <DialogContent initialFocus={focusAssignee ? assigneeReference : undefined}>
      <div className="flex shrink-0 items-center justify-between gap-4 border-b p-4 sm:p-4">
        <div className="flex min-w-0 flex-col gap-2">
          <DialogTitle className="flex items-center gap-2 font-bold text-xl">
            <SlidersHorizontalIcon className="size-5 shrink-0 text-primary-text" aria-hidden="true" />
            Редактирование этапа
          </DialogTitle>
        </div>
        <DialogClose
          disabled={editor.pending}
          aria-label="Закрыть редактор"
          render={<Button variant="ghost" size="icon-sm" />}
        >
          <XIcon />
        </DialogClose>
      </div>
      <FormProvider {...editor.form}>
        <form autoComplete="off" onSubmit={editor.save} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="overscroll-contain sm:p-4">
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <StageParameterField
                name="plannedStartDate"
                label="Плановое начало"
                disabled={isDisabled}
                min={editor.snapshot.projectPlannedStartDate}
                max={editor.snapshot.projectPlannedEndDate}
              />
              <StageParameterField
                name="plannedEndDate"
                label="Плановое окончание"
                disabled={isDisabled}
                min={editor.snapshot.projectPlannedStartDate}
                max={editor.snapshot.projectPlannedEndDate}
              />
              <StageParameterField name="plannedWorkAmountMinor" label="План работ, ₽" disabled={isDisabled} />
              <StageParameterField name="plannedMaterialAmountMinor" label="План материалов, ₽" disabled={isDisabled} />
              <Controller
                name="assignee"
                control={editor.form.control}
                render={({ field, fieldState: { error } }) => (
                  <AssigneePicker
                    {...field}
                    ref={(element) => {
                      field.ref(element);
                      assigneeReference.current = element;
                    }}
                    id="stage-assignee"
                    disabled={isDisabled}
                    error={error?.message}
                  />
                )}
              />
            </FieldGroup>
            {stage.status === 'paid' && (
              <p className="text-muted-foreground text-sm">
                План работ выплаченного этапа обязателен и не может превышать фактические выплаты.
              </p>
            )}
            {editor.message && (
              <Alert>
                <AlertDescription role="status">{editor.message}</AlertDescription>
              </Alert>
            )}
            {editor.needsReload && (
              <Button type="button" variant="outline" disabled={editor.pending} onClick={() => void editor.reload()}>
                Обновить данные, сохранив ввод
              </Button>
            )}
          </DialogBody>
          <DialogFooter className="pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-4">
            <Button type="button" variant="outline" disabled={editor.pending} onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={isDisabled}>
              {editor.pending ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </form>
      </FormProvider>
    </DialogContent>
  );
}
