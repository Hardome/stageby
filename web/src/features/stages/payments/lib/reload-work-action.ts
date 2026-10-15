import { getWorkPlanRow } from '@api/clients/getWorkPlanRow';
import { listWorkPayments } from '@api/clients/listWorkPayments';

import type { WorkAction } from '../model/types';

export async function reloadWorkAction(stageId: number, action: WorkAction): Promise<WorkAction> {
  if ('row' in action && action.row) {
    const row = await getWorkPlanRow({ path: { rowId: action.row.id } }).unwrap();

    return { ...action, row };
  }
  if ('payment' in action && action.payment) {
    const paymentId = action.payment.id;
    const payments = await listWorkPayments({ path: { stageId } }).unwrap();
    const payment = payments.find((item) => item.id === paymentId);
    if (!payment) throw Object.assign(new Error('Платёж больше недоступен.'), { status: 404 });

    return { ...action, payment };
  }

  return action;
}
