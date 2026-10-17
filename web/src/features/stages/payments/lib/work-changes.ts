import { parseAmount } from '@entities/project';

import type { WorkAction } from '../model/types';
import { rowRequest, type WorkFormValues } from './work-form';

export function isWorkActionUnchanged(action: WorkAction, values: WorkFormValues) {
  if (action.kind === 'row' && action.row) {
    const body = rowRequest(values);

    return (
      body.amountMinor === action.row.amountMinor &&
      body.recipientId === action.row.recipientId &&
      body.dueDate === action.row.dueDate
    );
  }

  return action.kind === 'payment' && action.payment
    ? parseAmount(values.amount) === action.payment.amountMinor &&
        values.date === action.payment.paidAt &&
        (values.comment.trim() || null) === (action.payment.comment?.trim() || null)
    : false;
}
