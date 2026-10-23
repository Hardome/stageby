import { type ReactNode, useSyncExternalStore } from 'react';

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { cn } from 'cn';
import { ChevronDownIcon } from 'lucide-react';

function subscribe(callback: () => void) {
  const media = window.matchMedia?.('(min-width: 1024px)');
  media?.addEventListener('change', callback);

  return () => media?.removeEventListener('change', callback);
}

function isDesktop() {
  return window.matchMedia?.('(min-width: 1024px)').matches ?? false;
}

interface StageSidebarBlockProperties {
  title: string;
  summary: string;
  children: ReactNode;
}

export function StageSidebarBlock({ title, summary, children }: Readonly<StageSidebarBlockProperties>) {
  const isWideScreen = useSyncExternalStore(subscribe, isDesktop, () => false);

  if (isWideScreen) return <div>{children}</div>;

  return (
    <AccordionPrimitive.Item value={title} className="overflow-hidden rounded-xl border bg-card text-card-foreground">
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger
          className={cn(
            'group/sidebar flex min-h-12 w-full cursor-pointer items-center justify-between gap-3',
            'p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          )}
        >
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-semibold">{title}</span>
            <span className="text-xs text-muted-foreground">{summary}</span>
          </span>
          <ChevronDownIcon
            className={cn(
              'size-4 shrink-0 transition-transform duration-200',
              'group-aria-expanded/sidebar:rotate-180 motion-reduce:transition-none',
            )}
            aria-hidden="true"
          />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Panel
        keepMounted
        className={cn(
          'overflow-hidden border-t data-open:animate-accordion-down data-closed:animate-accordion-up',
          'motion-reduce:animate-none',
        )}
      >
        <div
          className={cn(
            '[&>[data-slot=card]]:rounded-none [&>[data-slot=card]]:border-0',
            '[&_[data-slot=card-header]]:hidden',
          )}
        >
          {children}
        </div>
      </AccordionPrimitive.Panel>
    </AccordionPrimitive.Item>
  );
}
