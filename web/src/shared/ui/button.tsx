import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { tv, type VariantProps } from 'tailwind-variants';

const buttonVariants = tv({
  base: [
    'group/button inline-flex shrink-0 items-center justify-center rounded-(--radius-button) border',
    'border-transparent bg-clip-padding text-base font-bold whitespace-nowrap transition-all',
    'outline-none select-none focus-visible:border-ring focus-visible:ring-3',
    'focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive',
    'aria-invalid:ring-3 aria-invalid:ring-destructive/20',
    'dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  variants: {
    variant: {
      success: 'bg-success text-success-foreground hover:bg-success-hover',
      inverse: [
        'text-surface-inverse-foreground hover:bg-surface-inverse-accent',
        'focus-visible:border-primary focus-visible:ring-primary',
      ],
      default: 'bg-primary text-primary-foreground hover:bg-primary/80',
      outline: [
        'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted',
        'aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
      ],
      secondary: [
        'bg-secondary text-secondary-foreground',
        'hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]',
        'aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
      ],
      ghost: [
        'hover:bg-muted hover:text-foreground aria-expanded:bg-muted',
        'aria-expanded:text-foreground dark:hover:bg-muted/50',
      ],
      destructive: [
        'bg-destructive/10 text-destructive hover:bg-destructive/20',
        'focus-visible:border-destructive/40 focus-visible:ring-destructive/20',
        'dark:bg-destructive/20 dark:hover:bg-destructive/30',
        'dark:focus-visible:ring-destructive/40',
      ],
      link: 'text-primary-text underline-offset-4 hover:underline',
    },
    size: {
      default: 'h-12 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
      xs: [
        'h-8 gap-1 rounded-(--radius-button) px-2 text-xs',
        'in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5',
        "has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
      ],
      sm: [
        'h-10 gap-1 rounded-(--radius-button) px-2.5 text-[0.8rem]',
        'in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5',
        "has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
      ],
      lg: 'h-13 gap-2 px-6 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5',
      icon: 'size-12',
      'icon-xs': [
        'size-8 rounded-(--radius-button) in-data-[slot=button-group]:rounded-lg',
        "[&_svg:not([class*='size-'])]:size-3",
      ],
      'icon-sm': 'size-10 rounded-(--radius-button) in-data-[slot=button-group]:rounded-lg',
      'icon-lg': 'size-13',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...properties
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={
        typeof className === 'function'
          ? (state) => buttonVariants({ variant, size, className: className(state) })
          : buttonVariants({ variant, size, className })
      }
      {...properties}
    />
  );
}

export { Button, buttonVariants };
