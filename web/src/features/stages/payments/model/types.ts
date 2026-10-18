import type { Stage, WorkPayment } from '@api/types';

export type WorkAction = { kind: 'payment'; payment?: WorkPayment } | { kind: 'delete-payment'; payment: WorkPayment };

export interface WorkEditorProperties {
  stage: Stage;
  action: WorkAction;
  onClose: () => void;
}
