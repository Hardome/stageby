import { Link } from '@tanstack/react-router';
import { MapPinIcon } from 'lucide-react';

import { Button } from '@shared/ui/button';

import type { Stage } from '@api/types';

interface StageListActionsProperties {
  stage: Stage;
  offset: number;
}

export function StageListActions({ stage, offset }: StageListActionsProperties) {
  const { longitude, latitude } = stage.projectCoordinates;
  const mapUrl = `https://yandex.ru/maps/?pt=${longitude},${latitude}&z=16&l=map`;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link to="/stages/$stageId" params={{ stageId: String(stage.id) }} search={{ offset }} />}
        aria-label={`Открыть этап «${stage.title}»: ${stage.projectOwnerName}`}
      >
        Открыть этап
      </Button>
      <Button
        variant="outline"
        nativeButton={false}
        render={<a href={mapUrl} target="_blank" rel="noopener noreferrer" />}
        aria-label={`Открыть на карте: ${stage.projectAddress}`}
      >
        <MapPinIcon data-icon="inline-start" />
        Карта
      </Button>
    </div>
  );
}
