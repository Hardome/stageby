import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { createMaterialShortage } from '@api/clients/createMaterialShortage';
import { resolveMaterialShortage } from '@api/clients/resolveMaterialShortage';
import type { MaterialShortage, Stage, StageMaterialInvoice } from '@api/types';

import { shortageFormSchema } from './material-form';
import { useMaterialAction } from './use-material-action';

export function useInvoiceShortages(stage: Stage, invoice: StageMaterialInvoice, onSaved?: () => void) {
  const action = useMaterialAction(stage);
  const form = useForm({ defaultValues: { comment: '' }, resolver: zodResolver(shortageFormSchema) });

  function submit(values: { comment: string }) {
    return action.run(
      () => createMaterialShortage({ path: { invoiceId: invoice.id }, body: values }).unwrap(),
      () => {
        form.reset();
        onSaved?.();
      },
    );
  }

  function resolve(shortage: MaterialShortage) {
    return action.run(() =>
      resolveMaterialShortage({
        path: { shortageId: shortage.id },
        body: { expectedVersion: shortage.version },
      }).unwrap(),
    );
  }

  return { form, action, submit, resolve };
}
