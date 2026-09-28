'use client';

import * as React from 'react';

import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { cn } from 'cn';
import type { VariantProps } from 'tailwind-variants';

import { toggleVariants } from '@shared/ui/toggle';

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants> & {
    spacing?: number;
    orientation?: 'horizontal' | 'vertical';
  }
>({
  size: 'default',
  square: false,
  variant: 'default',
  spacing: 2,
  orientation: 'horizontal',
});

function ToggleGroup({
  className,
  variant,
  size,
  square = false,
  spacing = 2,
  orientation = 'horizontal',
  children,
  ...properties
}: ToggleGroupPrimitive.Props &
  VariantProps<typeof toggleVariants> & {
    spacing?: number;
    orientation?: 'horizontal' | 'vertical';
  }) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      style={{ '--gap': spacing } as React.CSSProperties}
      className={cn(
        'group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))]',
        'data-vertical:flex-col data-vertical:items-stretch',
        square ? 'rounded-none' : 'rounded-lg data-[size=sm]:rounded-[min(var(--radius-md),10px)]',
        className,
      )}
      {...properties}
    >
      <ToggleGroupContext.Provider value={{ variant, size, square, spacing, orientation }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant = 'default',
  size = 'default',
  square = false,
  ...properties
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);

  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        'shrink-0 focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:rounded-none',
        'group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0',
        'group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0',
        'group-data-[spacing=0]/toggle-group:px-2',
        'group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-1.5',
        'group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-1.5',
        !(square || context.square) && [
          'group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-r-lg',
          'group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-b-lg',
          'group-data-vertical/toggle-group:data-[spacing=0]:first:rounded-t-lg',
          'group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-l-lg',
        ],
        'group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t',
        'group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l',
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
          square: context.square || square,
        }),
        className,
      )}
      {...properties}
    >
      {children}
    </TogglePrimitive>
  );
}

export { ToggleGroup, ToggleGroupItem };
