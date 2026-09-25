CREATE TYPE "public"."acceptance_decision" AS ENUM('accepted', 'rejected');--> statement-breakpoint
CREATE TABLE "acceptance_items" (
	"acceptanceId" integer NOT NULL,
	"checklistItemId" integer NOT NULL,
	CONSTRAINT "acceptance_items_pk" PRIMARY KEY("acceptanceId","checklistItemId")
);
--> statement-breakpoint
CREATE TABLE "acceptances" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "acceptances_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"stageId" integer NOT NULL,
	"decision" "acceptance_decision" NOT NULL,
	"comment" varchar(5000),
	"correctionDueDate" date,
	"decidedByUserId" integer NOT NULL,
	"decidedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "acceptances_comment_not_blank_check" CHECK ("acceptances"."comment" is null or btrim("acceptances"."comment") <> ''),
	CONSTRAINT "acceptances_decision_data_check" CHECK (("acceptances"."decision" = 'accepted' and "acceptances"."correctionDueDate" is null) or ("acceptances"."decision" = 'rejected' and "acceptances"."comment" is not null and "acceptances"."correctionDueDate" is not null))
);
--> statement-breakpoint
CREATE TABLE "checklist_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "checklist_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"checklistId" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"position" integer NOT NULL,
	"isCompleted" boolean DEFAULT false NOT NULL,
	"completedAt" timestamp with time zone,
	"completedByUserId" integer,
	CONSTRAINT "checklist_items_title_not_blank_check" CHECK (btrim("checklist_items"."title") <> ''),
	CONSTRAINT "checklist_items_position_check" CHECK ("checklist_items"."position" between 1 and 4),
	CONSTRAINT "checklist_items_completion_metadata_check" CHECK (("checklist_items"."isCompleted" and "checklist_items"."completedAt" is not null and "checklist_items"."completedByUserId" is not null) or (not "checklist_items"."isCompleted" and "checklist_items"."completedAt" is null and "checklist_items"."completedByUserId" is null))
);
--> statement-breakpoint
CREATE TABLE "checklists" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "checklists_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"stageId" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checklists_version_check" CHECK ("checklists"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "acceptance_items" ADD CONSTRAINT "acceptance_items_acceptanceId_acceptances_id_fk" FOREIGN KEY ("acceptanceId") REFERENCES "public"."acceptances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptance_items" ADD CONSTRAINT "acceptance_items_checklistItemId_checklist_items_id_fk" FOREIGN KEY ("checklistItemId") REFERENCES "public"."checklist_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptances" ADD CONSTRAINT "acceptances_stageId_stages_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptances" ADD CONSTRAINT "acceptances_decidedByUserId_users_id_fk" FOREIGN KEY ("decidedByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_checklistId_checklists_id_fk" FOREIGN KEY ("checklistId") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_completedByUserId_users_id_fk" FOREIGN KEY ("completedByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_stageId_stages_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "acceptance_items_checklist_item_idx" ON "acceptance_items" USING btree ("checklistItemId");--> statement-breakpoint
CREATE INDEX "acceptances_stage_decided_at_idx" ON "acceptances" USING btree ("stageId","decidedAt");--> statement-breakpoint
CREATE INDEX "acceptances_decided_by_user_idx" ON "acceptances" USING btree ("decidedByUserId");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_items_checklist_position_unique" ON "checklist_items" USING btree ("checklistId","position");--> statement-breakpoint
CREATE INDEX "checklist_items_completed_by_user_idx" ON "checklist_items" USING btree ("completedByUserId");--> statement-breakpoint
CREATE UNIQUE INDEX "checklists_stage_id_unique" ON "checklists" USING btree ("stageId");