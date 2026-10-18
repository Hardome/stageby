import { parseAmount } from '@entities/project';

import type { WorkAction } from '../model/types';
import type { WorkFormValues } from './work-form';

export function isWorkActionUnchanged(action: WorkAction, values: WorkFormValues) {
  return action.kind === 'payment' && action.payment
    ? parseAmount(values.amount) === action.payment.amountMinor &&
        values.date === action.payment.paidAt &&
        (values.comment.trim() || null) === (action.payment.comment?.trim() || null)
    : false;
}
