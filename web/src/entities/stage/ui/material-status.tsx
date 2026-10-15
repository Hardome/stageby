import { Badge } from '@shared/ui/badge';

import type { MaterialIndicator } from '@api/types';

import { materialDescriptions } from '../lib/material-description';

interface MaterialStatusProperties {
  summary: MaterialIndicator;
}

export function MaterialStatus({ summary }: MaterialStatusProperties) {
  const variants = { red: 'destructive', yellow: 'caution', green: 'success' } as const;

  return (
    <span className="flex max-w-full flex-wrap gap-1.5">
      {materialDescriptions(summary).map((description) => (
        <Badge key={description} variant={variants[summary.color]}>
          {description}
        </Badge>
      ))}
    </span>
  );
}
