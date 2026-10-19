import type { ReactNode } from 'react';

import { cn } from 'cn';
import { ArrowUpRightIcon, EllipsisIcon } from 'lucide-react';

import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';

import { useInvoiceFile } from '../lib/use-invoice-file';

interface InvoiceFileMenuProperties {
  fileId: number;
  children?: ReactNode;
}

export function InvoiceFileMenu({ fileId, children }: InvoiceFileMenuProperties) {
  const file = useInvoiceFile(fileId);

  return (
    <div className="flex max-w-full flex-col items-end gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Действия со счётом" />}>
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className={cn(
            'w-59 max-w-[calc(100vw-2rem)] shadow-lg',
            '[&_[role=menuitem]:not([data-disabled])]:cursor-pointer [&_[role=menuitem]]:min-h-12',
          )}
        >
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={file.pending} onClick={() => void file.open()}>
              <ArrowUpRightIcon />
              Посмотреть счёт
            </DropdownMenuItem>
            {children}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {file.message && (
        <Alert variant="destructive">
          <AlertDescription>{file.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
