import type { ReactNode } from 'react';

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@shared/ui/empty';

interface InvoiceListProperties {
  count: number;
  emptyDescription: string;
  action?: ReactNode;
  children: ReactNode;
}

export function InvoiceList({ count, emptyDescription, action, children }: InvoiceListProperties) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-xl">Счета</h2>
        {action}
      </div>
      {count === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Счетов пока нет</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">{children}</ul>
      )}
    </div>
  );
}
