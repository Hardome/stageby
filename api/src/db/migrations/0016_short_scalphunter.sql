DROP INDEX "checklist_items_checklist_position_unique";--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN "deletedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "creationIdempotencyKey" varchar(100);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "creationFingerprint" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX "projects_creation_idempotency_key_unique" ON "projects" USING btree ("creationIdempotencyKey");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_items_checklist_position_unique" ON "checklist_items" USING btree ("checklistId","position") WHERE "checklist_items"."deletedAt" is null;