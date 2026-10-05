CREATE TYPE "public"."acceptance_decision" AS ENUM('accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."file_purpose" AS ENUM('project_document', 'checklist_photo', 'material_invoice');--> statement-breakpoint
CREATE TYPE "public"."file_status" AS ENUM('pending', 'uploaded', 'failed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."stage_status" AS ENUM('created', 'assigned', 'supplied', 'in_progress', 'acceptance', 'rework', 'completed', 'paid');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('manager', 'foreman');--> statement-breakpoint
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
CREATE TABLE "checklist_item_photos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "checklist_item_photos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"checklistItemId" integer NOT NULL,
	"fileId" integer NOT NULL,
	"position" integer NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedByRetention" boolean DEFAULT false NOT NULL,
	CONSTRAINT "checklist_item_photos_position_check" CHECK ("checklist_item_photos"."position" between 1 and 20)
);
--> statement-breakpoint
CREATE TABLE "checklist_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "checklist_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"checklistId" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"photoHint" varchar(1000),
	"position" integer NOT NULL,
	"isCompleted" boolean DEFAULT false NOT NULL,
	"requiresRework" boolean DEFAULT false NOT NULL,
	"completedAt" timestamp with time zone,
	"completedByUserId" integer,
	"deletedAt" timestamp with time zone,
	CONSTRAINT "checklist_items_title_not_blank_check" CHECK (btrim("checklist_items"."title") <> ''),
	CONSTRAINT "checklist_items_position_check" CHECK ("checklist_items"."position" > 0),
	CONSTRAINT "checklist_items_photo_hint_not_blank_check" CHECK ("checklist_items"."photoHint" is null or btrim("checklist_items"."photoHint") <> ''),
	CONSTRAINT "checklist_items_completion_metadata_check" CHECK (("checklist_items"."isCompleted" and "checklist_items"."completedAt" is not null and "checklist_items"."completedByUserId" is not null) or (not "checklist_items"."isCompleted" and "checklist_items"."completedAt" is null and "checklist_items"."completedByUserId" is null))
);
--> statement-breakpoint
CREATE TABLE "checklist_template_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "checklist_template_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"checklistTemplateId" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"photoHint" varchar(1000),
	"position" integer NOT NULL,
	CONSTRAINT "checklist_template_items_title_not_blank_check" CHECK (btrim("checklist_template_items"."title") <> ''),
	CONSTRAINT "checklist_template_items_photo_hint_not_blank_check" CHECK ("checklist_template_items"."photoHint" is null or btrim("checklist_template_items"."photoHint") <> ''),
	CONSTRAINT "checklist_template_items_position_check" CHECK ("checklist_template_items"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "checklist_templates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "checklist_templates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"stageTypeCode" varchar(50) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "files" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "files_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"status" "file_status" DEFAULT 'pending' NOT NULL,
	"purpose" "file_purpose" NOT NULL,
	"storageKey" varchar(500) NOT NULL,
	"originalName" varchar(255) NOT NULL,
	"mimeType" varchar(255) NOT NULL,
	"sizeBytes" integer NOT NULL,
	"checksumSha256" varchar(64) NOT NULL,
	"uploadedByUserId" integer NOT NULL,
	"uploadExpiresAt" timestamp with time zone NOT NULL,
	"uploadedAt" timestamp with time zone,
	"expiresAt" timestamp with time zone,
	"deletedAt" timestamp with time zone,
	"completionIdempotencyKey" varchar(100),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_storage_key_not_blank_check" CHECK (btrim("files"."storageKey") <> ''),
	CONSTRAINT "files_original_name_not_blank_check" CHECK (btrim("files"."originalName") <> ''),
	CONSTRAINT "files_mime_type_not_blank_check" CHECK (btrim("files"."mimeType") <> ''),
	CONSTRAINT "files_size_bytes_check" CHECK ("files"."sizeBytes" > 0),
	CONSTRAINT "files_checksum_sha256_check" CHECK ("files"."checksumSha256" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "files_lifecycle_check" CHECK (("files"."status" = 'pending' and "files"."uploadedAt" is null and "files"."deletedAt" is null) or ("files"."status" = 'uploaded' and "files"."uploadedAt" is not null and "files"."deletedAt" is null) or ("files"."status" = 'failed' and "files"."uploadedAt" is null) or ("files"."status" = 'deleted' and "files"."deletedAt" is not null))
);
--> statement-breakpoint
CREATE TABLE "material_invoices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "material_invoices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"stageId" integer NOT NULL,
	"fileId" integer NOT NULL,
	"supplierName" varchar(255),
	"amountMinor" bigint NOT NULL,
	"paidAt" timestamp with time zone,
	"paidByUserId" integer,
	"deliveredAt" timestamp with time zone,
	"deliveredByUserId" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "material_invoices_supplier_not_blank_check" CHECK ("material_invoices"."supplierName" is null or btrim("material_invoices"."supplierName") <> ''),
	CONSTRAINT "material_invoices_amount_check" CHECK ("material_invoices"."amountMinor" > 0 and "material_invoices"."amountMinor" % 100 = 0),
	CONSTRAINT "material_invoices_paid_author_check" CHECK (("material_invoices"."paidAt" is null and "material_invoices"."paidByUserId" is null) or ("material_invoices"."paidAt" is not null and "material_invoices"."paidByUserId" is not null)),
	CONSTRAINT "material_invoices_delivered_author_check" CHECK (("material_invoices"."deliveredAt" is null and "material_invoices"."deliveredByUserId" is null) or ("material_invoices"."deliveredAt" is not null and "material_invoices"."deliveredByUserId" is not null)),
	CONSTRAINT "material_invoices_version_check" CHECK ("material_invoices"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "material_shortages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "material_shortages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"invoiceId" integer NOT NULL,
	"comment" text NOT NULL,
	"reportedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"reportedByUserId" integer NOT NULL,
	"resolvedAt" timestamp with time zone,
	"resolvedByUserId" integer,
	"resolutionComment" text,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "material_shortages_comment_check" CHECK (btrim("material_shortages"."comment") <> '' and char_length("material_shortages"."comment") <= 500),
	CONSTRAINT "material_shortages_resolution_comment_check" CHECK ("material_shortages"."resolutionComment" is null or (btrim("material_shortages"."resolutionComment") <> '' and char_length("material_shortages"."resolutionComment") <= 500)),
	CONSTRAINT "material_shortages_resolution_author_check" CHECK (("material_shortages"."resolvedAt" is null and "material_shortages"."resolvedByUserId" is null and "material_shortages"."resolutionComment" is null) or ("material_shortages"."resolvedAt" is not null and "material_shortages"."resolvedByUserId" is not null)),
	CONSTRAINT "material_shortages_version_check" CHECK ("material_shortages"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "project_documents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"projectId" integer NOT NULL,
	"fileId" integer NOT NULL,
	"position" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_documents_position_check" CHECK ("project_documents"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "projects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"ownerName" varchar(255) NOT NULL,
	"address" varchar(1000) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"cadastralNumber" varchar(100),
	"houseDesign" varchar(255),
	"contractLabel" varchar(255),
	"plannedStartDate" date NOT NULL,
	"plannedEndDate" date NOT NULL,
	"notes" text,
	"isArchived" boolean DEFAULT false NOT NULL,
	"creationIdempotencyKey" varchar(100),
	"creationFingerprint" varchar(64),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_owner_name_not_blank_check" CHECK (btrim("projects"."ownerName") <> ''),
	CONSTRAINT "projects_address_not_blank_check" CHECK (btrim("projects"."address") <> ''),
	CONSTRAINT "projects_latitude_range_check" CHECK ("projects"."latitude" between -90 and 90),
	CONSTRAINT "projects_longitude_range_check" CHECK ("projects"."longitude" between -180 and 180),
	CONSTRAINT "projects_planned_dates_check" CHECK ("projects"."plannedEndDate" >= "projects"."plannedStartDate"),
	CONSTRAINT "projects_cadastral_number_not_blank_check" CHECK ("projects"."cadastralNumber" is null or btrim("projects"."cadastralNumber") <> ''),
	CONSTRAINT "projects_house_design_not_blank_check" CHECK ("projects"."houseDesign" is null or btrim("projects"."houseDesign") <> ''),
	CONSTRAINT "projects_contract_label_not_blank_check" CHECK ("projects"."contractLabel" is null or btrim("projects"."contractLabel") <> ''),
	CONSTRAINT "projects_notes_not_blank_check" CHECK ("projects"."notes" is null or btrim("projects"."notes") <> ''),
	CONSTRAINT "projects_notes_length_check" CHECK ("projects"."notes" is null or char_length("projects"."notes") <= 5000)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"tokenHash" varchar(64) NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"revokedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_format_check" CHECK ("sessions"."tokenHash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "sessions_expiry_check" CHECK ("sessions"."expiresAt" > "sessions"."createdAt"),
	CONSTRAINT "sessions_revoked_at_check" CHECK ("sessions"."revokedAt" is null or "sessions"."revokedAt" >= "sessions"."createdAt")
);
--> statement-breakpoint
CREATE TABLE "stage_predecessors" (
	"projectId" integer NOT NULL,
	"stageId" integer NOT NULL,
	"predecessorStageId" integer NOT NULL,
	CONSTRAINT "stage_predecessors_pk" PRIMARY KEY("projectId","stageId","predecessorStageId"),
	CONSTRAINT "stage_predecessors_not_self_check" CHECK ("stage_predecessors"."stageId" <> "stage_predecessors"."predecessorStageId")
);
--> statement-breakpoint
CREATE TABLE "stage_types" (
	"code" varchar(50) PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"position" integer NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stage_types_code_not_blank_check" CHECK (btrim("stage_types"."code") <> ''),
	CONSTRAINT "stage_types_title_not_blank_check" CHECK (btrim("stage_types"."title") <> ''),
	CONSTRAINT "stage_types_position_check" CHECK ("stage_types"."position" > 0)
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"projectId" integer NOT NULL,
	"stageTypeCode" varchar(50) NOT NULL,
	"position" integer NOT NULL,
	"workSubtypes" varchar(255)[] DEFAULT '{}'::varchar[] NOT NULL,
	"assigneeId" integer,
	"status" "stage_status" DEFAULT 'created' NOT NULL,
	"plannedStartDate" date NOT NULL,
	"plannedEndDate" date NOT NULL,
	"plannedWorkAmountMinor" bigint,
	"plannedMaterialAmountMinor" bigint,
	"actualStartDate" date,
	"actualEndDate" date,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stages_project_id_id_unique" UNIQUE("projectId","id"),
	CONSTRAINT "stages_position_check" CHECK ("stages"."position" between 1 and 8),
	CONSTRAINT "stages_work_subtypes_count_check" CHECK (cardinality("stages"."workSubtypes") <= 30),
	CONSTRAINT "stages_work_subtypes_no_null_check" CHECK (array_position("stages"."workSubtypes", null) is null),
	CONSTRAINT "stages_planned_dates_check" CHECK ("stages"."plannedEndDate" >= "stages"."plannedStartDate"),
	CONSTRAINT "stages_planned_work_amount_check" CHECK ("stages"."plannedWorkAmountMinor" is null or "stages"."plannedWorkAmountMinor" >= 0),
	CONSTRAINT "stages_planned_material_amount_check" CHECK ("stages"."plannedMaterialAmountMinor" is null or "stages"."plannedMaterialAmountMinor" >= 0),
	CONSTRAINT "stages_notes_not_blank_check" CHECK ("stages"."notes" is null or btrim("stages"."notes") <> ''),
	CONSTRAINT "stages_notes_length_check" CHECK ("stages"."notes" is null or char_length("stages"."notes") <= 5000),
	CONSTRAINT "stages_version_check" CHECK ("stages"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"login" varchar(64) NOT NULL,
	"passwordHash" varchar(512) NOT NULL,
	"fullName" varchar(255) NOT NULL,
	"role" "user_role" NOT NULL,
	"phone" varchar(32),
	"isActive" boolean DEFAULT true NOT NULL,
	"passwordResetRequestedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_login_format_check" CHECK ("users"."login" ~ '^[a-z0-9][a-z0-9._-]{2,63}$'),
	CONSTRAINT "users_password_hash_not_blank_check" CHECK (btrim("users"."passwordHash") <> ''),
	CONSTRAINT "users_full_name_not_blank_check" CHECK (btrim("users"."fullName") <> ''),
	CONSTRAINT "users_phone_not_blank_check" CHECK ("users"."phone" is null or btrim("users"."phone") <> '')
);
--> statement-breakpoint
CREATE TABLE "work_payments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "work_payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"stageId" integer NOT NULL,
	"recipientId" integer NOT NULL,
	"paidAt" date NOT NULL,
	"amountMinor" bigint NOT NULL,
	"comment" varchar(1000),
	"createdByUserId" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_payments_amount_check" CHECK ("work_payments"."amountMinor" > 0),
	CONSTRAINT "work_payments_comment_not_blank_check" CHECK ("work_payments"."comment" is null or btrim("work_payments"."comment") <> ''),
	CONSTRAINT "work_payments_version_check" CHECK ("work_payments"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "acceptance_items" ADD CONSTRAINT "acceptance_items_acceptanceId_acceptances_id_fk" FOREIGN KEY ("acceptanceId") REFERENCES "public"."acceptances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptance_items" ADD CONSTRAINT "acceptance_items_checklistItemId_checklist_items_id_fk" FOREIGN KEY ("checklistItemId") REFERENCES "public"."checklist_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptances" ADD CONSTRAINT "acceptances_stageId_stages_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acceptances" ADD CONSTRAINT "acceptances_decidedByUserId_users_id_fk" FOREIGN KEY ("decidedByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_changes" ADD CONSTRAINT "audit_changes_eventId_audit_events_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."audit_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_item_photos" ADD CONSTRAINT "checklist_item_photos_checklistItemId_checklist_items_id_fk" FOREIGN KEY ("checklistItemId") REFERENCES "public"."checklist_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_item_photos" ADD CONSTRAINT "checklist_item_photos_fileId_files_id_fk" FOREIGN KEY ("fileId") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_checklistId_checklists_id_fk" FOREIGN KEY ("checklistId") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_completedByUserId_users_id_fk" FOREIGN KEY ("completedByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_checklistTemplateId_checklist_templates_id_fk" FOREIGN KEY ("checklistTemplateId") REFERENCES "public"."checklist_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_stageTypeCode_stage_types_code_fk" FOREIGN KEY ("stageTypeCode") REFERENCES "public"."stage_types"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_stageId_stages_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploadedByUserId_users_id_fk" FOREIGN KEY ("uploadedByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_stageId_stages_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_fileId_files_id_fk" FOREIGN KEY ("fileId") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_paidByUserId_users_id_fk" FOREIGN KEY ("paidByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_deliveredByUserId_users_id_fk" FOREIGN KEY ("deliveredByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_shortages" ADD CONSTRAINT "material_shortages_invoiceId_material_invoices_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."material_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_shortages" ADD CONSTRAINT "material_shortages_reportedByUserId_users_id_fk" FOREIGN KEY ("reportedByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_shortages" ADD CONSTRAINT "material_shortages_resolvedByUserId_users_id_fk" FOREIGN KEY ("resolvedByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_fileId_files_id_fk" FOREIGN KEY ("fileId") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_predecessors" ADD CONSTRAINT "stage_predecessors_stage_fk" FOREIGN KEY ("projectId","stageId") REFERENCES "public"."stages"("projectId","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_predecessors" ADD CONSTRAINT "stage_predecessors_predecessor_fk" FOREIGN KEY ("projectId","predecessorStageId") REFERENCES "public"."stages"("projectId","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_stageTypeCode_stage_types_code_fk" FOREIGN KEY ("stageTypeCode") REFERENCES "public"."stage_types"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_assigneeId_users_id_fk" FOREIGN KEY ("assigneeId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_payments" ADD CONSTRAINT "work_payments_stageId_stages_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_payments" ADD CONSTRAINT "work_payments_recipientId_users_id_fk" FOREIGN KEY ("recipientId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_payments" ADD CONSTRAINT "work_payments_createdByUserId_users_id_fk" FOREIGN KEY ("createdByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "acceptance_items_checklist_item_idx" ON "acceptance_items" USING btree ("checklistItemId");--> statement-breakpoint
CREATE INDEX "acceptances_stage_decided_at_idx" ON "acceptances" USING btree ("stageId","decidedAt");--> statement-breakpoint
CREATE INDEX "acceptances_decided_by_user_idx" ON "acceptances" USING btree ("decidedByUserId");--> statement-breakpoint
CREATE INDEX "audit_changes_event_idx" ON "audit_changes" USING btree ("eventId");--> statement-breakpoint
CREATE INDEX "audit_changes_entity_idx" ON "audit_changes" USING btree ("entityType","entityKey");--> statement-breakpoint
CREATE INDEX "audit_changes_project_idx" ON "audit_changes" USING btree ("projectId","eventId");--> statement-breakpoint
CREATE INDEX "audit_changes_stage_idx" ON "audit_changes" USING btree ("stageId","eventId");--> statement-breakpoint
CREATE INDEX "audit_events_occurred_at_idx" ON "audit_events" USING btree ("occurredAt","id");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_item_photos_file_unique" ON "checklist_item_photos" USING btree ("fileId");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_item_photos_active_position_unique" ON "checklist_item_photos" USING btree ("checklistItemId","position") WHERE "checklist_item_photos"."deletedAt" is null;--> statement-breakpoint
CREATE INDEX "checklist_item_photos_item_idx" ON "checklist_item_photos" USING btree ("checklistItemId");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_items_checklist_position_unique" ON "checklist_items" USING btree ("checklistId","position") WHERE "checklist_items"."deletedAt" is null;--> statement-breakpoint
CREATE INDEX "checklist_items_completed_by_user_idx" ON "checklist_items" USING btree ("completedByUserId");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_template_items_template_position_unique" ON "checklist_template_items" USING btree ("checklistTemplateId","position");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_templates_active_stage_type_unique" ON "checklist_templates" USING btree ("stageTypeCode") WHERE "checklist_templates"."isActive";--> statement-breakpoint
CREATE UNIQUE INDEX "checklists_stage_id_unique" ON "checklists" USING btree ("stageId");--> statement-breakpoint
CREATE UNIQUE INDEX "files_storage_key_unique" ON "files" USING btree ("storageKey");--> statement-breakpoint
CREATE UNIQUE INDEX "files_completion_idempotency_key_unique" ON "files" USING btree ("completionIdempotencyKey");--> statement-breakpoint
CREATE INDEX "files_expiration_cleanup_idx" ON "files" USING btree ("expiresAt") WHERE "files"."deletedAt" is null and "files"."expiresAt" is not null;--> statement-breakpoint
CREATE INDEX "files_pending_cleanup_idx" ON "files" USING btree ("uploadExpiresAt") WHERE "files"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "material_invoices_stage_idx" ON "material_invoices" USING btree ("stageId");--> statement-breakpoint
CREATE INDEX "material_invoices_stage_paid_delivered_idx" ON "material_invoices" USING btree ("stageId","paidAt","deliveredAt");--> statement-breakpoint
CREATE UNIQUE INDEX "material_invoices_file_unique" ON "material_invoices" USING btree ("fileId");--> statement-breakpoint
CREATE INDEX "material_shortages_invoice_idx" ON "material_shortages" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "material_shortages_open_idx" ON "material_shortages" USING btree ("invoiceId") WHERE "material_shortages"."resolvedAt" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "project_documents_project_position_unique" ON "project_documents" USING btree ("projectId","position");--> statement-breakpoint
CREATE UNIQUE INDEX "project_documents_file_unique" ON "project_documents" USING btree ("fileId");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_creation_idempotency_key_unique" ON "projects" USING btree ("creationIdempotencyKey");--> statement-breakpoint
CREATE INDEX "projects_archived_created_at_idx" ON "projects" USING btree ("isArchived","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("tokenHash");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "stage_predecessors_predecessor_idx" ON "stage_predecessors" USING btree ("predecessorStageId");--> statement-breakpoint
CREATE UNIQUE INDEX "stage_types_position_unique" ON "stage_types" USING btree ("position");--> statement-breakpoint
CREATE UNIQUE INDEX "stages_project_type_unique" ON "stages" USING btree ("projectId","stageTypeCode");--> statement-breakpoint
CREATE UNIQUE INDEX "stages_project_position_unique" ON "stages" USING btree ("projectId","position");--> statement-breakpoint
CREATE INDEX "stages_assignee_status_idx" ON "stages" USING btree ("assigneeId","status");--> statement-breakpoint
CREATE INDEX "stages_status_idx" ON "stages" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_login_unique" ON "users" USING btree ("login");--> statement-breakpoint
CREATE INDEX "users_role_active_idx" ON "users" USING btree ("role","isActive");--> statement-breakpoint
CREATE INDEX "work_payments_stage_paid_at_idx" ON "work_payments" USING btree ("stageId","paidAt");
--> statement-breakpoint
INSERT INTO "stage_types" ("code", "title", "position") VALUES
	('foundation', 'Фундамент', 1),
	('walls', 'Стены', 2),
	('roof', 'Крыша', 3),
	('windows', 'Окна, двери', 4),
	('facade', 'Фасад', 5),
	('electrical', 'Электрика', 6),
	('finishing', 'Штукатурка', 7),
	('heating', 'Отопление', 8);--> statement-breakpoint
INSERT INTO "checklist_templates" ("stageTypeCode")
SELECT "code" FROM "stage_types"
WHERE "code" IN ('foundation', 'walls', 'roof', 'windows', 'facade', 'electrical', 'finishing', 'heating')
ORDER BY "position";--> statement-breakpoint
INSERT INTO "checklist_template_items" ("checklistTemplateId", "title", "photoHint", "position")
SELECT template."id", item."title", item."photoHint", item."position"
FROM "checklist_templates" template
JOIN (
  VALUES
    ('foundation', 1, 'Подготовка котлована и канализации', 'Котлован должен войти во весь кадр с двух сторон'),
    ('foundation', 2, 'Армирование', 'Фото перевязки всех углов и перехлёста арматуры'),
    ('foundation', 3, 'Тёплые полы', 'Фото развязки тёплого пола и вывода в коллекторные группы'),
    ('foundation', 4, 'Бетонные работы и укрытие бетона плёнкой', 'Фото фундамента с двух сторон'),
    ('foundation', 5, 'Уборка', NULL),
    ('walls', 1, 'Стартовый ряд, армировка стартового ряда', 'Фото армировки и первого ряда'),
    ('walls', 2, 'Кладка до первой армировки', 'Фото кладки'),
    ('walls', 3, 'Кладка до второй армировки', 'Фото кладки'),
    ('walls', 4, 'Кладка до третьего ряда армировки', 'Фото кладки'),
    ('walls', 5, 'Армопояс', 'Фото армировки армопояса'),
    ('walls', 6, 'Уборка', NULL),
    ('roof', 1, 'Мауэрлат', 'Фото крепления мауэрлата'),
    ('roof', 2, 'Лаги, стропила', 'Фото крепления лаг и стропил'),
    ('roof', 3, 'Пароизоляция', 'Фото крыши со всех сторон'),
    ('roof', 4, 'Утепление', 'Фото утеплителя'),
    ('roof', 5, 'Ветрозащита и обрешётка', 'Фото ветрозащиты с обрешёткой'),
    ('roof', 6, 'Кровельное покрытие', 'Фото кровли со всех сторон'),
    ('roof', 7, 'Лобовые, торцевые планки', 'Фото планок'),
    ('roof', 8, 'Уборка', NULL),
    ('windows', 1, 'Установка окон', 'Фото каждого окна'),
    ('windows', 2, 'Установка дверей', 'Фото каждой двери'),
    ('windows', 3, 'Уборка', NULL),
    ('facade', 1, 'Утепление', 'Фото утеплителя'),
    ('facade', 2, 'Армировка', 'Фото армировки'),
    ('facade', 3, 'Фасадное покрытие', 'Фото фасада со всех сторон'),
    ('facade', 4, 'Уборка', NULL),
    ('electrical', 1, 'Установка щитового оборудования', 'Фото всех щитков'),
    ('electrical', 2, 'Установка распределительных коробок', 'Фото каждой коробки'),
    ('electrical', 3, 'Уборка', NULL),
    ('finishing', 1, 'Армировка штукатурных углов, проёмов', 'Фото углов и проёмов'),
    ('finishing', 2, 'Штукатурка', 'Фото всех стен'),
    ('finishing', 3, 'Уборка', NULL),
    ('heating', 1, 'Установка котлов и коллекторов', 'Фото соединений, котлов и коллекторов'),
    ('heating', 2, 'Уборка', NULL)
) AS item("stageTypeCode", "position", "title", "photoHint")
  ON item."stageTypeCode" = template."stageTypeCode"
WHERE template."isActive";

--> statement-breakpoint
CREATE FUNCTION ensure_active_stage_type() RETURNS trigger AS $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM "stage_types"
		WHERE "code" = NEW."stageTypeCode" AND "isActive"
	) THEN
		RAISE EXCEPTION 'stage type % is inactive or missing', NEW."stageTypeCode"
			USING ERRCODE = 'check_violation';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "stages_active_type_trigger"
	BEFORE INSERT OR UPDATE OF "stageTypeCode" ON "stages"
	FOR EACH ROW EXECUTE FUNCTION ensure_active_stage_type();--> statement-breakpoint
CREATE FUNCTION ensure_stage_dates_within_project() RETURNS trigger AS $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM "projects"
		WHERE "id" = NEW."projectId"
			AND NEW."plannedStartDate" >= "plannedStartDate"
			AND NEW."plannedEndDate" <= "plannedEndDate"
	) THEN
		RAISE EXCEPTION 'stage dates must be within project dates'
			USING ERRCODE = 'check_violation';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "stages_project_dates_trigger"
	BEFORE INSERT OR UPDATE OF "projectId", "plannedStartDate", "plannedEndDate" ON "stages"
	FOR EACH ROW EXECUTE FUNCTION ensure_stage_dates_within_project();--> statement-breakpoint
CREATE FUNCTION ensure_project_contains_stage_dates() RETURNS trigger AS $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "stages"
		WHERE "projectId" = NEW."id"
			AND ("plannedStartDate" < NEW."plannedStartDate" OR "plannedEndDate" > NEW."plannedEndDate")
	) THEN
		RAISE EXCEPTION 'project dates must contain all stage dates'
			USING ERRCODE = 'check_violation';
	END IF;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "projects_stage_dates_trigger"
	BEFORE UPDATE OF "plannedStartDate", "plannedEndDate" ON "projects"
	FOR EACH ROW EXECUTE FUNCTION ensure_project_contains_stage_dates();
