import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cn } from 'cn';

function Tabs({ className, ...properties }: Readonly<TabsPrimitive.Root.Props>) {
  return <TabsPrimitive.Root className={cn('flex min-w-0 flex-col gap-4', className)} {...properties} />;
}

function TabsList({ className, ...properties }: Readonly<TabsPrimitive.List.Props>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'flex min-h-12 w-full items-stretch rounded-xl border bg-muted p-1 text-muted-foreground',
        className,
      )}
      {...properties}
    />
  );
}

function TabsTrigger({ className, ...properties }: Readonly<TabsPrimitive.Tab.Props>) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        'flex min-w-0 flex-1 items-center justify-center rounded-lg px-2 py-2 text-center text-sm font-medium',
        'transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50 data-active:bg-background data-active:text-foreground',
        className,
      )}
      {...properties}
    />
  );
}

function TabsContent({ className, ...properties }: Readonly<TabsPrimitive.Panel.Props>) {
  return <TabsPrimitive.Panel className={cn('min-w-0 outline-none data-hidden:hidden', className)} {...properties} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
