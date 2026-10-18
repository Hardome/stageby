import { listWorkPayments } from '@api/clients/listWorkPayments';

import type { WorkAction } from '../model/types';

export async function reloadWorkAction(stageId: number, action: WorkAction): Promise<WorkAction> {
  if ('payment' in action && action.payment) {
    const paymentId = action.payment.id;
    const payments = await listWorkPayments({ path: { stageId } }).unwrap();
    const payment = payments.find((item) => item.id === paymentId);
    if (!payment) throw Object.assign(new Error('Платёж больше недоступен.'), { status: 404 });

    return { ...action, payment };
  }

  return action;
}
