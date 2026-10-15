import { ChevronDownIcon, CircleAlertIcon, ListOrderedIcon, XIcon } from 'lucide-react';

import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from '@shared/ui/drawer';

import { useStageDrawer } from '../lib/use-stage-drawer';
import type { ProjectStageNavigationProperties } from '../model/navigation';
import { ProjectStageNavigation } from './project-stage-navigation';

export function ProjectStageDrawer(properties: ProjectStageNavigationProperties) {
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
          <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
            {position === -1 ? stages.length : `${position + 1} из ${stages.length}`}
          </span>
          <ChevronDownIcon data-icon="inline-end" />
        </DrawerTrigger>
        <DrawerContent finalFocus={finalFocus}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 pt-1 pb-4">
            <div className="flex min-w-0 flex-col gap-1">
              <DrawerTitle className="font-semibold text-lg">Этапы проекта</DrawerTitle>
              <DrawerDescription className="text-muted-foreground text-sm">
                Включено этапов: {stages.length}. Выберите нужный.
              </DrawerDescription>
            </div>
            <DrawerClose
              render={<Button type="button" variant="ghost" size="icon-sm" />}
              aria-label="Закрыть список этапов"
            >
              <XIcon />
            </DrawerClose>
          </div>
          <div ref={listReference} className="min-h-0 overflow-y-auto overscroll-contain px-3 py-3">
            <ProjectStageNavigation {...properties} onStageChange={selectStage} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
