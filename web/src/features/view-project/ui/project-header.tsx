import { ArrowUpRightIcon, CalendarDaysIcon, MapPinIcon } from 'lucide-react';

import { formatDate, projectStatuses } from '@entities/project';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';

import type { Project } from '@api/types';

interface ProjectHeaderProperties {
  project: Project;
}

export function ProjectHeader({ project }: ProjectHeaderProperties) {
  const { coordinates } = project;
  const mapUrl = `https://yandex.ru/maps/?pt=${coordinates.longitude},${coordinates.latitude}&z=16&l=map`;
  return (
    <header className="flex flex-col gap-6 border-b pb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
            Объект строительства
          </span>
          <Badge variant={project.status === 'completed' ? 'success' : 'outline'}>
            {projectStatuses[project.status]}
          </Badge>
          {project.isArchived && <Badge variant="outline">В архиве</Badge>}
        </div>
        <h1 className="wrap-anywhere font-bold text-3xl tracking-tight sm:text-4xl">{project.ownerName}</h1>
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="wrap-anywhere text-sm sm:text-base">{project.address}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          nativeButton={false}
          render={<a href={mapUrl} target="_blank" rel="noopener noreferrer" />}
        >
          Открыть на карте <ArrowUpRightIcon data-icon="inline-end" />
        </Button>
        <p className="text-muted-foreground text-xs">
          Координаты: {coordinates.latitude}, {coordinates.longitude}
        </p>
      </div>
      <div className="grid shrink-0 grid-cols-2 rounded-xl border bg-card text-card-foreground">
        <div className="flex flex-col gap-2 border-r p-4 sm:px-6">
          <span className="flex items-center gap-2 text-muted-foreground text-xs">
            <CalendarDaysIcon className="size-4" aria-hidden="true" />
            Начало
          </span>
          <span className="font-semibold text-base tabular-nums">{formatDate(project.plannedStartDate)}</span>
        </div>
        <div className="flex flex-col gap-2 p-4 sm:px-6">
          <span className="text-muted-foreground text-xs">Завершение</span>
          <span className="font-semibold text-base tabular-nums">{formatDate(project.plannedEndDate)}</span>
        </div>
      </div>
    </header>
  );
}
