import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer';
import { cn } from 'cn';

export function DrawerContent({ className, children, ...properties }: DrawerPrimitive.Popup.Props) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop data-slot="drawer-overlay" />
      <DrawerPrimitive.Viewport data-slot="drawer-viewport">
        <DrawerPrimitive.Popup data-slot="drawer-content" className={cn(className)} {...properties}>
          <div data-slot="drawer-handle" aria-hidden="true" />
          <DrawerPrimitive.Content data-slot="drawer-body">{children}</DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}
