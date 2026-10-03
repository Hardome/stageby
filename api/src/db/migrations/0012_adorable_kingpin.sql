CREATE TABLE "audit_changes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_changes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"eventId" integer NOT NULL,
	"entityType" text NOT NULL,
	"entityKey" jsonb NOT NULL,
	"projectId" integer,
	"stageId" integer,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	CONSTRAINT "audit_changes_action_check" CHECK ("audit_changes"."action" in ('create', 'update', 'delete')),
	CONSTRAINT "audit_changes_snapshots_check" CHECK (("audit_changes"."action" = 'create' and "audit_changes"."before" is null and "audit_changes"."after" is not null) or ("audit_changes"."action" = 'update' and "audit_changes"."before" is not null and "audit_changes"."after" is not null) or ("audit_changes"."action" = 'delete' and "audit_changes"."before" is not null and "audit_changes"."after" is null))
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"occurredAt" timestamp with time zone DEFAULT now() NOT NULL,
	"operation" text NOT NULL,
	"source" text NOT NULL,
	"requestId" text,
	"actorUserId" integer,
	"actorSnapshot" jsonb,
	"formatVersion" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "audit_events_source_check" CHECK ("audit_events"."source" in ('api', 'command', 'system'))
);
--> statement-breakpoint
ALTER TABLE "audit_changes" ADD CONSTRAINT "audit_changes_eventId_audit_events_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."audit_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_changes_event_idx" ON "audit_changes" USING btree ("eventId");--> statement-breakpoint
CREATE INDEX "audit_changes_entity_idx" ON "audit_changes" USING btree ("entityType","entityKey");--> statement-breakpoint
CREATE INDEX "audit_changes_project_idx" ON "audit_changes" USING btree ("projectId","eventId");--> statement-breakpoint
CREATE INDEX "audit_changes_stage_idx" ON "audit_changes" USING btree ("stageId","eventId");--> statement-breakpoint
CREATE INDEX "audit_events_occurred_at_idx" ON "audit_events" USING btree ("occurredAt","id");