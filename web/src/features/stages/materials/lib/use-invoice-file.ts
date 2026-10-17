import { useRef, useState } from 'react';

import { useAccessError } from '@shared/lib/hooks';

import { getFileContent } from '@api/clients/getFileContent';

export function useInvoiceFile(fileId: number) {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const accessError = useAccessError();

  async function open() {
    if (busy.current) return;
    const tab = window.open('about:blank', '_blank');
    if (!tab) {
      setMessage('Разрешите открытие новой вкладки и повторите попытку.');

      return;
    }
    tab.opener = null;
    busy.current = true;
    setPending(true);
    setMessage('');
    try {
      const file = await getFileContent({ path: { fileId } }).unwrap();
      tab.location.href = file.downloadUrl;
    } catch (error) {
      tab.close();
      accessError(error);
      setMessage('Не удалось открыть счёт. Повторите попытку.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return { open, pending, message };
}
