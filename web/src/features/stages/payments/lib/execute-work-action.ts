import { parseAmount } from '@entities/project';

import { createWorkPayment } from '@api/clients/createWorkPayment';
import { deleteWorkPayment } from '@api/clients/deleteWorkPayment';
import { updateWorkPayment } from '@api/clients/updateWorkPayment';

import type { WorkAction } from '../model/types';
import type { WorkFormValues } from './work-form';

export async function executeWorkAction(stageId: number, action: WorkAction, values: WorkFormValues, version: number) {
  const expectedVersion = version;
  if (action.kind === 'delete-payment') {
    return deleteWorkPayment({ path: { paymentId: action.payment.id }, body: { expectedVersion } }).unwrap();
  }

  const body = {
    amountMinor: parseAmount(values.amount) ?? 0n,
    paidAt: values.date,
    comment: values.comment.trim() || null,
  };

  return action.payment
    ? updateWorkPayment({ path: { paymentId: action.payment.id }, body: { ...body, expectedVersion } }).unwrap()
    : createWorkPayment({ path: { stageId }, body }).unwrap();
}
