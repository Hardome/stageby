import { Button } from '@shared/ui/button';
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@shared/ui/field';
import { Separator } from '@shared/ui/separator';
import { Skeleton } from '@shared/ui/skeleton';

import { ProjectFormPanel } from './project-form-panel';
import { ProjectProgress } from './project-progress';

export function ProjectFormSkeleton() {
  return (
    <div aria-hidden="true" className="grid min-w-0 gap-6 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-8">
      <ProjectProgress
        step={1}
        stages={[]}
        currentStage={undefined}
        disabled
        onStageChange={() => {}}
        onStepChange={() => {}}
      />
      <ProjectFormPanel
        step={1}
        title="Объект"
        description="Заполните сведения о доме. Поля со звёздочкой обязательны."
        actions={
          <div className="flex w-full flex-wrap justify-between gap-3">
            <Button variant="outline" disabled>
              Отмена
            </Button>
            <Skeleton className="h-12 w-40" />
          </div>
        }
      >
        <FieldGroup className="gap-6">
          <FieldSet>
            <FieldLegend>Клиент и адрес</FieldLegend>
            <Field>
              <FieldLabel>Клиент</FieldLabel>
              <Skeleton className="h-12 w-full" />
            </Field>
            <FieldGroup className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              {['Адрес', 'Координаты'].map((label) => (
                <Field key={label}>
                  <FieldLabel>{label}</FieldLabel>
                  <Skeleton className="h-12 w-full" />
                </Field>
              ))}
            </FieldGroup>
          </FieldSet>
          <Separator />
          <FieldSet>
            <FieldLegend>Сроки проекта</FieldLegend>
            <FieldGroup className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
              {['Начало проекта', 'Окончание проекта'].map((label) => (
                <Field key={label}>
                  <FieldLabel>{label}</FieldLabel>
                  <Skeleton className="h-12 w-full" />
                </Field>
              ))}
            </FieldGroup>
          </FieldSet>
          <Separator />
          <div className="flex flex-col gap-3">
            <p className="font-medium text-sm">Проект (PDF)</p>
            <p className="text-muted-foreground text-sm">Один или несколько PDF до 50 МБ каждый</p>
            <Skeleton className="h-24 w-full" />
          </div>
        </FieldGroup>
      </ProjectFormPanel>
    </div>
  );
}
