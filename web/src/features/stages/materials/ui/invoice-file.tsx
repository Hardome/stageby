import { ArrowUpRightIcon } from 'lucide-react';

import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Spinner } from '@shared/ui/spinner';

import { useInvoiceFile } from '../lib/use-invoice-file';

export function InvoiceFile({ fileId }: { fileId: number }) {
  const { open, pending, message } = useInvoiceFile(fileId);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => void open()}>
        {pending && <Spinner data-icon="inline-start" />}Посмотреть счёт
        <ArrowUpRightIcon data-icon="inline-end" />
      </Button>
      {message && (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
