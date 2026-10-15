import type * as React from 'react';

import { cn } from 'cn';

function Table({ className, ...properties }: React.ComponentProps<'table'>) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto rounded-(--radius-card) border bg-card text-card-foreground"
    >
      <table data-slot="table" className={cn('w-full caption-bottom text-sm', className)} {...properties} />
    </div>
  );
}

function TableHeader({ className, ...properties }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...properties} />;
}

function TableBody({ className, ...properties }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...properties} />;
}

function TableFooter({ className, ...properties }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('border-t bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
      {...properties}
    />
  );
}

function TableRow({ className, ...properties }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted',
        className,
      )}
      {...properties}
    />
  );
}

function TableHead({ className, ...properties }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-10 whitespace-nowrap px-4 text-left align-middle font-semibold',
        'text-muted-foreground [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...properties}
    />
  );
}

function TableCell({ className, ...properties }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('whitespace-nowrap px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0', className)}
      {...properties}
    />
  );
}

function TableCaption({ className, ...properties }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-muted-foreground text-sm', className)}
      {...properties}
    />
  );
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
