import { Badge } from '@shared/ui/badge';

import type { MaterialIndicator } from '@api/types';

import { materialDescriptions } from '../lib/material-description';

interface MaterialStatusProperties {
  summary: MaterialIndicator;
}

export function MaterialStatus({ summary }: MaterialStatusProperties) {
  const variants = { red: 'destructive', yellow: 'caution', green: 'success' } as const;
  const statusVariants =
    summary.openShortageCount > 0 || summary.invoiceCount === 0
      ? [variants[summary.color]]
      : ([
          summary.paidInvoiceCount === summary.invoiceCount ? 'success' : 'caution',
          summary.deliveredInvoiceCount === summary.invoiceCount ? 'success' : 'caution',
        ] as const);

  return (
    <span className="flex max-w-full flex-wrap gap-1.5">
      {materialDescriptions(summary).map((description, index) => (
        <Badge key={description} variant={statusVariants[index] ?? variants[summary.color]}>
          {description}
        </Badge>
      ))}
    </span>
  );
}
