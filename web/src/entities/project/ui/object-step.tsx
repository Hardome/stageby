import type { ReactNode } from 'react';

import { CalendarDaysIcon, MapPinIcon } from 'lucide-react';

import { FieldGroup, FieldLegend, FieldSet } from '@shared/ui/field';
import { Separator } from '@shared/ui/separator';

import type { useDocuments } from '../lib/use-documents';
import { DocumentPicker } from './document-picker';
import { ProjectDateField } from './project-date-field';
import { ProjectField } from './project-field';

interface ObjectStepProperties {
  isLocked: boolean;
  uploads: ReturnType<typeof useDocuments>;
  children?: ReactNode;
}

export function ObjectStep({ isLocked, uploads, children }: ObjectStepProperties) {
  return (
    <FieldGroup className="gap-4">
      <FieldSet>
        <FieldLegend className="flex items-center gap-2">
          <MapPinIcon aria-hidden="true" className="size-4 text-primary-text" />
          Клиент и адрес
        </FieldLegend>
        <ProjectField
          name="ownerName"
          label="Клиент"
          required
          maxLength={150}
          autoComplete="name"
          disabled={isLocked}
        />
        <FieldGroup className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ProjectField name="address" label="Адрес" required autoComplete="street-address" disabled={isLocked} />
          <ProjectField
            name="coordinates"
            label="Координаты"
            required
            placeholder="55.7558, 37.6176"
            disabled={isLocked}
          />
        </FieldGroup>
      </FieldSet>
      <Separator />
      <FieldSet>
        <FieldLegend className="flex items-center gap-2">
          <CalendarDaysIcon aria-hidden="true" className="size-4 text-primary-text" />
          Сроки проекта
        </FieldLegend>
        <FieldGroup className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          <ProjectDateField name="plannedStartDate" label="Начало проекта" required disabled={isLocked} />
          <ProjectDateField name="plannedEndDate" label="Окончание проекта" required disabled={isLocked} />
        </FieldGroup>
      </FieldSet>
      <Separator />
      <FieldGroup className="gap-3">
        <DocumentPicker
          documents={uploads.documents}
          error={uploads.error}
          disabled={isLocked}
          onSelect={uploads.select}
          onReject={uploads.setError}
          onRetry={(document) => void uploads.retry(document)}
          onRemove={uploads.remove}
        />
        {children}
      </FieldGroup>
    </FieldGroup>
  );
}
