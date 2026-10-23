import { PackageIcon, WalletIcon } from 'lucide-react';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';

export function StageFinancesSkeleton({ category }: Readonly<{ category: 'materials' | 'work' }>) {
  const isMaterials = category === 'materials';
  const Icon = isMaterials ? PackageIcon : WalletIcon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="flex items-center gap-2">
            <Icon className="size-5 text-primary-text" aria-hidden="true" />
            {isMaterials ? 'Материалы' : 'Оплата работ'}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">Фактические затраты</p>
          <Skeleton className="h-9 w-3/5" />
        </div>
        {isMaterials && <Skeleton className="h-6 w-32" />}
      </CardContent>
      <CardFooter className="bg-background text-foreground">
        <dl className="grid w-full grid-cols-2 gap-4">
          {['План', 'Остаток'].map((label) => (
            <div key={label}>
              <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
              <dd>
                <Skeleton className="h-5 w-3/4" />
              </dd>
            </div>
          ))}
        </dl>
      </CardFooter>
    </Card>
  );
}
