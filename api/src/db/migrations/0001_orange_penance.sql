CREATE TABLE "work_plan_rows" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "work_plan_rows_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"stageId" integer NOT NULL,
	"amountMinor" bigint NOT NULL,
	"recipientId" integer,
	"dueDate" date,
	"version" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_plan_rows_stage_id_id_unique" UNIQUE("stageId","id"),
	CONSTRAINT "work_plan_rows_amount_check" CHECK ("work_plan_rows"."amountMinor" >= 0 and "work_plan_rows"."amountMinor" % 100 = 0),
	CONSTRAINT "work_plan_rows_version_check" CHECK ("work_plan_rows"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "stages" DROP CONSTRAINT "stages_position_check";--> statement-breakpoint
ALTER TABLE "stages" DROP CONSTRAINT "stages_planned_dates_check";--> statement-breakpoint
ALTER TABLE "stages" ALTER COLUMN "plannedStartDate" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "stages" ALTER COLUMN "plannedEndDate" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD COLUMN "paidAmountMinor" bigint;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD COLUMN "paidDate" date;--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN "isIncluded" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "work_payments" ADD COLUMN "workPlanRowId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "work_plan_rows" ADD CONSTRAINT "work_plan_rows_stageId_stages_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_plan_rows" ADD CONSTRAINT "work_plan_rows_recipientId_users_id_fk" FOREIGN KEY ("recipientId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_plan_rows_stage_due_date_idx" ON "work_plan_rows" USING btree ("stageId","dueDate");--> statement-breakpoint
CREATE INDEX "work_plan_rows_recipient_idx" ON "work_plan_rows" USING btree ("recipientId");--> statement-breakpoint
ALTER TABLE "work_payments" ADD CONSTRAINT "work_payments_plan_row_stage_fk" FOREIGN KEY ("stageId","workPlanRowId") REFERENCES "public"."work_plan_rows"("stageId","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_payments_plan_row_idx" ON "work_payments" USING btree ("workPlanRowId");--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_paid_amount_check" CHECK ("material_invoices"."paidAmountMinor" is null or ("material_invoices"."paidAmountMinor" > 0 and "material_invoices"."paidAmountMinor" % 100 = 0));--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_paid_details_check" CHECK (("material_invoices"."paidAt" is null and "material_invoices"."paidAmountMinor" is null and "material_invoices"."paidDate" is null) or ("material_invoices"."paidAt" is not null and "material_invoices"."paidAmountMinor" is not null and "material_invoices"."paidDate" is not null));--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_position_check" CHECK ("stages"."position" between 1 and 9);--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_planned_dates_check" CHECK ("stages"."plannedStartDate" is null or "stages"."plannedEndDate" is null or "stages"."plannedEndDate" >= "stages"."plannedStartDate");
--> statement-breakpoint
INSERT INTO "stage_types" ("code", "title", "position") VALUES ('additional', 'Дополнительный этап', 9);
--> statement-breakpoint
DROP TRIGGER "stages_project_dates_trigger" ON "stages";
--> statement-breakpoint
DROP TRIGGER "projects_stage_dates_trigger" ON "projects";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION ensure_stage_dates_within_project() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "stages" s JOIN "projects" p ON p.id = s."projectId"
    WHERE s.id = NEW.id AND s."isIncluded" AND (
      (s."plannedStartDate" IS NOT NULL AND (s."plannedStartDate" < p."plannedStartDate" OR s."plannedStartDate" > p."plannedEndDate")) OR
      (s."plannedEndDate" IS NOT NULL AND (s."plannedEndDate" < p."plannedStartDate" OR s."plannedEndDate" > p."plannedEndDate"))
    )
  ) THEN
    RAISE EXCEPTION 'stage dates must be within project dates' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "stages_project_dates_trigger"
  AFTER INSERT OR UPDATE ON "stages" DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION ensure_stage_dates_within_project();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION ensure_project_contains_stage_dates() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "stages" s JOIN "projects" p ON p.id = s."projectId"
    WHERE p.id = NEW.id AND s."isIncluded" AND (
      (s."plannedStartDate" IS NOT NULL AND (s."plannedStartDate" < p."plannedStartDate" OR s."plannedStartDate" > p."plannedEndDate")) OR
      (s."plannedEndDate" IS NOT NULL AND (s."plannedEndDate" < p."plannedStartDate" OR s."plannedEndDate" > p."plannedEndDate"))
    )
  ) THEN
    RAISE EXCEPTION 'project dates must contain all stage dates' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "projects_stage_dates_trigger"
  AFTER UPDATE ON "projects" DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION ensure_project_contains_stage_dates();
