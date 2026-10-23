import { type ReactNode, useRef, useState } from 'react';

import { cn } from 'cn';
import { ArrowUpRightIcon, FileTextIcon } from 'lucide-react';

import { useAccessError } from '@shared/lib/hooks';
import { Alert, AlertDescription } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Spinner } from '@shared/ui/spinner';

import { getFileContent } from '@api/clients/getFileContent';

interface ProjectDocumentProperties {
  fileId: number;
  number: number;
  action?: ReactNode;
}

export function ProjectDocument({ fileId, number, action }: Readonly<ProjectDocumentProperties>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const accessError = useAccessError();

  async function open() {
    if (busy.current) return;
    const tab = window.open('about:blank', '_blank');
    if (!tab) {
      setError('Разрешите открытие новой вкладки и повторите попытку.');

      return;
    }
    tab.opener = null;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const file = await getFileContent({ path: { fileId }, throwOnError: true }).unwrap();
      tab.location.href = file.downloadUrl;
    } catch (error_) {
      tab.close();
      accessError(error_);
      setError('Не удалось открыть PDF. Повторите попытку.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={cn('flex min-w-0 items-center gap-1', action && 'rounded-(--radius-control) border p-1')}>
        <Button
          variant={action ? 'ghost' : 'outline'}
          className="h-auto min-h-16 min-w-0 flex-1 justify-start gap-3 px-3 py-3 text-left"
          aria-label={`Открыть PDF ${number}`}
          disabled={pending}
          onClick={() => void open()}
        >
          {pending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <FileTextIcon data-icon="inline-start" className="text-primary-text" />
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-semibold">Документ {number}</span>
            <span className="text-xs font-normal text-muted-foreground">PDF · Открыть файл</span>
          </span>
          <ArrowUpRightIcon data-icon="inline-end" />
        </Button>
        {action}
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
