import type { Stage, WorkPayment, WorkPlanRow } from '@api/types';

export type WorkAction =
  | { kind: 'row'; row?: WorkPlanRow }
  | { kind: 'payment'; rowId: number; payment?: WorkPayment }
  | { kind: 'distribute'; row: WorkPlanRow }
  | { kind: 'delete-row'; row: WorkPlanRow }
  | { kind: 'delete-payment'; payment: WorkPayment }
  | { kind: 'paid' };

export interface WorkEditorProperties {
  stage: Stage;
  action: WorkAction;
  onClose: () => void;
}
