import type { WorkPaymentRow } from '#app/db/schema/work-payments';
import type { WorkPayment } from '#app/generated/types.gen';

export function toWorkPayment(
  payment: WorkPaymentRow,
  createdBy: { id: number; fullName: string },
  recipient: WorkPayment['recipient'],
): WorkPayment {
  return {
    id: payment.id,
    stageId: payment.stageId,
    paidAt: payment.paidAt,
    amountMinor: payment.amountMinor,
    comment: payment.comment,
    createdBy,
    recipient,
    version: payment.version,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}
