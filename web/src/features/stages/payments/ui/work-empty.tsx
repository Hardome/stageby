import { WalletCardsIcon } from 'lucide-react';

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@shared/ui/empty';

export function WorkEmpty({ manager }: { manager: boolean }) {
  return (
    <Empty className="rounded-xl border border-dashed bg-background py-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WalletCardsIcon />
        </EmptyMedia>
        <EmptyTitle>Строк пока нет</EmptyTitle>
        <EmptyDescription>
          {manager
            ? 'Запланируйте первую выплату: укажите сумму, получателя и удобный срок.'
            : 'Здесь появятся назначенные вам строки и история выплат.'}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
