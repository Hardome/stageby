import { Link } from '@tanstack/react-router';
import { cn } from 'cn';
import { ArrowUpRightIcon, MapPinIcon, PencilIcon } from 'lucide-react';

import { formatDate, projectStatuses } from '@entities/project';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

import type { Project } from '@api/types';

interface ProjectHeaderProperties {
  project: Project;
  onEdit?: () => void;
}

export function ProjectHeader({ project, onEdit }: ProjectHeaderProperties) {
  const { coordinates } = project;
  const mapUrl = `https://yandex.ru/maps/?pt=${coordinates.longitude},${coordinates.latitude}&z=16&l=map`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button className="self-start" variant="ghost" nativeButton={false} render={<Link to="/" />}>
          ← Дашборд
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<a href={mapUrl} target="_blank" rel="noopener noreferrer" />}
          >
            Открыть на карте <ArrowUpRightIcon data-icon="inline-end" />
          </Button>
          {!project.isArchived && onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <PencilIcon data-icon="inline-start" /> Редактировать объект
            </Button>
          )}
        </div>
      </div>
      <header className="overflow-hidden rounded-2xl border bg-card text-card-foreground">
        <div
          className={cn(
            'grid gap-4 bg-surface-inverse p-3 text-surface-inverse-foreground',
            'sm:p-4 lg:grid-cols-[1fr_280px]',
          )}
        >
          <CardHeader className="min-w-0 gap-4 p-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0">
                <CardTitle>
                  <h1 className="wrap-anywhere font-bold text-2xl tracking-tight sm:text-3xl">{project.ownerName}</h1>
                </CardTitle>
              </div>
              <Badge variant={project.status === 'completed' ? 'success' : 'secondary'}>
                {projectStatuses[project.status]}
              </Badge>
              {project.isArchived && <Badge variant="secondary">В архиве</Badge>}
            </div>
            <CardDescription
              className={cn('flex max-w-xl items-center gap-2 text-sm', 'text-surface-inverse-muted leading-relaxed')}
            >
              <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
              <span className="wrap-anywhere min-w-0">{project.address}</span>
            </CardDescription>
          </CardHeader>

          <div
            className={cn(
              'grid grid-cols-2 gap-4 rounded-xl border border-surface-inverse-border',
              'bg-surface-inverse-accent p-4',
            )}
          >
            <div className="flex flex-col gap-2">
              <span className="text-surface-inverse-muted text-xs">Начало</span>
              <span className="font-semibold text-base tabular-nums">{formatDate(project.plannedStartDate)}</span>
            </div>
            <div className="flex flex-col gap-2 border-surface-inverse-foreground/25 border-l pl-3">
              <span className="text-surface-inverse-muted text-xs">Завершение</span>
              <span className="font-semibold text-base tabular-nums">{formatDate(project.plannedEndDate)}</span>
            </div>
          </div>
        </div>
        <CardContent className="flex flex-col gap-3 p-4 sm:px-5">
          <p className="text-muted-foreground text-xs">
            Координаты: {coordinates.latitude}, {coordinates.longitude}
          </p>
        </CardContent>
      </header>
    </div>
  );
}
