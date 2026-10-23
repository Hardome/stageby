import { cn } from 'cn';
import { ChevronDownIcon, CircleAlertIcon, ListOrderedIcon, XIcon } from 'lucide-react';

import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from '@shared/ui/drawer';

import { useStageDrawer } from '../lib/use-stage-drawer';
import type { ProjectStageNavigationProperties } from '../model/navigation';
import { ProjectStageNavigation } from './project-stage-navigation';

export function ProjectStageDrawer(properties: Readonly<ProjectStageNavigationProperties>) {
  const { stages, currentStage, disabled, onStageChange } = properties;
  const { isOpen, onOpenChange, onOpenChangeComplete, finalFocus, listReference, selectStage } = useStageDrawer(
    disabled,
    onStageChange,
  );
  const position = stages.findIndex((stage) => stage.index === currentStage);
  const errorCount = stages.filter((stage) => stage.hasError).length;
  const title = stages[position]?.title ?? (stages.length > 0 ? 'Перейти к этапу' : 'Выберите этапы');

  return (
    <div className="mt-3 min-w-0 lg:hidden">
      <Drawer open={isOpen} onOpenChange={onOpenChange} onOpenChangeComplete={onOpenChangeComplete}>
        <DrawerTrigger
          render={<Button type="button" variant="outline" className="w-full justify-start gap-3 px-3" />}
          disabled={disabled || stages.length === 0}
          aria-label={`Выбрать этап: ${title}`}
        >
          <ListOrderedIcon data-icon="inline-start" />
          <span className="min-w-0 flex-1 truncate text-left text-sm">{title}</span>
          {errorCount > 0 && (
            <Badge variant="destructive" aria-label={`Этапов с ошибками: ${errorCount}`}>
              <CircleAlertIcon aria-hidden="true" />
              {errorCount}
            </Badge>
          )}
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {position === -1 ? stages.length : `${position + 1} из ${stages.length}`}
          </span>
          <ChevronDownIcon data-icon="inline-end" />
        </DrawerTrigger>
        <DrawerContent finalFocus={finalFocus}>
          <div
            className={cn(
              'grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1',
              'border-b px-4 pt-1 pb-4',
            )}
          >
            <DrawerTitle className="text-lg font-semibold">Этапы проекта</DrawerTitle>
            <DrawerClose
              render={<Button type="button" variant="ghost" size="icon-sm" />}
              aria-label="Закрыть список этапов"
            >
              <XIcon />
            </DrawerClose>
            <DrawerDescription className="col-span-2 text-sm text-muted-foreground">
              Включено этапов: {stages.length}. Выберите нужный.
            </DrawerDescription>
          </div>
          <div ref={listReference} className="min-h-0 overflow-y-auto overscroll-contain px-3 py-3">
            <ProjectStageNavigation {...properties} onStageChange={selectStage} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
