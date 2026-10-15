import { parseAmount } from '@entities/project';

import { changeStageStatus } from '@api/clients/changeStageStatus';
import { createWorkPayment } from '@api/clients/createWorkPayment';
import { createWorkPlanRow } from '@api/clients/createWorkPlanRow';
import { deleteWorkPayment } from '@api/clients/deleteWorkPayment';
import { deleteWorkPlanRow } from '@api/clients/deleteWorkPlanRow';
import { distributeWorkPlanRow } from '@api/clients/distributeWorkPlanRow';
import { updateWorkPayment } from '@api/clients/updateWorkPayment';
import { updateWorkPlanRow } from '@api/clients/updateWorkPlanRow';
import type { UpdateWorkPlanRow } from '@api/types';

import type { WorkAction } from '../model/types';
import { rowRequest, type WorkFormValues } from './work-form';

export async function executeWorkAction(stageId: number, action: WorkAction, values: WorkFormValues, version: number) {
  const expectedVersion = version;

  switch (action.kind) {
    case 'row': {
      const body = rowRequest(values);

      if (!action.row) return createWorkPlanRow({ path: { stageId }, body }).unwrap();

      const patch: UpdateWorkPlanRow = { expectedVersion };
      if (body.amountMinor !== action.row.amountMinor) patch.amountMinor = body.amountMinor;
      if (body.recipientId !== action.row.recipientId) patch.recipientId = body.recipientId;
      if (body.dueDate !== action.row.dueDate) patch.dueDate = body.dueDate;

      return updateWorkPlanRow({ path: { rowId: action.row.id }, body: patch }).unwrap();
    }
    case 'payment': {
      const body = {
        amountMinor: parseAmount(values.amount) ?? 0n,
        paidAt: values.date,
        comment: values.comment.trim() || null,
      };

      return action.payment
        ? updateWorkPayment({ path: { paymentId: action.payment.id }, body: { ...body, expectedVersion } }).unwrap()
        : createWorkPayment({ path: { stageId }, body: { ...body, workPlanRowId: action.rowId } }).unwrap();
    }
    case 'distribute': {
      return distributeWorkPlanRow({
        path: { rowId: action.row.id },
        body: { expectedVersion, rows: values.rows.map((row) => rowRequest(row)) },
      }).unwrap();
    }
    case 'delete-row': {
      return deleteWorkPlanRow({ path: { rowId: action.row.id }, body: { expectedVersion } }).unwrap();
    }
    case 'delete-payment': {
      return deleteWorkPayment({ path: { paymentId: action.payment.id }, body: { expectedVersion } }).unwrap();
    }
    case 'paid': {
      return changeStageStatus({ path: { stageId }, body: { expectedVersion, status: 'paid' } }).unwrap();
    }
  }
}
