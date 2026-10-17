import type { RejectStage } from '@api/types';

export type ReworkFormValues = Omit<RejectStage, 'expectedVersion' | 'correctionDueDate'> & {
  correctionDueDate: string;
};
