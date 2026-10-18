ALTER TABLE "work_payments" DROP CONSTRAINT "work_payments_plan_row_stage_fk";
--> statement-breakpoint
DROP TABLE "work_plan_rows";--> statement-breakpoint
DROP INDEX "work_payments_plan_row_idx";--> statement-breakpoint
ALTER TABLE "work_payments" DROP COLUMN "workPlanRowId";
