DROP INDEX "work_payments_stage_idx";--> statement-breakpoint
ALTER TABLE "work_payments" ADD COLUMN "paidAt" date NOT NULL;--> statement-breakpoint
ALTER TABLE "work_payments" ADD COLUMN "comment" varchar(1000);--> statement-breakpoint
ALTER TABLE "work_payments" ADD COLUMN "createdByUserId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "work_payments" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "work_payments" ADD COLUMN "updatedAt" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "work_payments" ADD CONSTRAINT "work_payments_createdByUserId_users_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_payments_stage_paid_at_idx" ON "work_payments" USING btree ("stageId","paidAt");--> statement-breakpoint
ALTER TABLE "work_payments" ADD CONSTRAINT "work_payments_comment_not_blank_check" CHECK ("work_payments"."comment" is null or btrim("work_payments"."comment") <> '');--> statement-breakpoint
ALTER TABLE "work_payments" ADD CONSTRAINT "work_payments_version_check" CHECK ("work_payments"."version" >= 1);