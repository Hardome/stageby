import { AlertTriangleIcon, CheckIcon } from 'lucide-react';

import { formatDate } from '@entities/project';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';

import type { MaterialShortage } from '@api/types';

interface InvoiceShortageItemProperties {
  shortage: MaterialShortage;
  canResolve: boolean;
  onResolve?: () => void;
}

export function InvoiceShortageItem({ shortage, canResolve, onResolve }: InvoiceShortageItemProperties) {
  return (
    <Alert variant={shortage.resolvedAt ? 'default' : 'destructive'}>
      {shortage.resolvedAt ? <CheckIcon aria-hidden="true" /> : <AlertTriangleIcon aria-hidden="true" />}
      <AlertDescription className="flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-semibold">{shortage.resolvedAt ? 'Нехватка устранена' : 'Не хватает материалов'}</p>
          {!shortage.resolvedAt && <span className="text-xs">Требует решения</span>}
        </div>
        <p className="wrap-anywhere whitespace-pre-wrap">{shortage.comment}</p>
        <p className="text-xs">
          {shortage.reportedBy.fullName} · {formatDate(shortage.reportedAt.slice(0, 10))}
        </p>
        {shortage.resolvedAt && (
          <p className="text-xs">
            Устранена: {shortage.resolvedBy?.fullName} · {formatDate(shortage.resolvedAt.slice(0, 10))}
          </p>
        )}
        {shortage.resolutionComment && <p className="wrap-anywhere">{shortage.resolutionComment}</p>}
        {!shortage.resolvedAt && canResolve && (
          <Button className="self-start" variant="outline" size="sm" onClick={onResolve}>
            Подтвердить устранение
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
