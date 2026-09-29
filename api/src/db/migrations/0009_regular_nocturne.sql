CREATE TYPE "public"."file_purpose" AS ENUM('project_document', 'checklist_photo', 'material_invoice');--> statement-breakpoint
CREATE TABLE "project_documents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"projectId" integer NOT NULL,
	"fileId" integer NOT NULL,
	"position" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_documents_position_check" CHECK ("project_documents"."position" > 0)
);
--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_document_file_ids_positive_check";--> statement-breakpoint
ALTER TABLE "checklist_item_photos" ADD COLUMN "position" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "purpose" "file_purpose" NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "storageKey" varchar(500) NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "originalName" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "checksumSha256" varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "uploadedByUserId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "uploadExpiresAt" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "uploadedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "expiresAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "deletedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "completionIdempotencyKey" varchar(100);--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_fileId_files_id_fk" FOREIGN KEY ("fileId") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_documents_project_position_unique" ON "project_documents" USING btree ("projectId","position");--> statement-breakpoint
CREATE UNIQUE INDEX "project_documents_file_unique" ON "project_documents" USING btree ("fileId");--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploadedByUserId_users_id_fk" FOREIGN KEY ("uploadedByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_item_photos_active_position_unique" ON "checklist_item_photos" USING btree ("checklistItemId","position") WHERE "checklist_item_photos"."deletedAt" is null;--> statement-breakpoint
CREATE INDEX "checklist_item_photos_item_idx" ON "checklist_item_photos" USING btree ("checklistItemId");--> statement-breakpoint
CREATE UNIQUE INDEX "files_storage_key_unique" ON "files" USING btree ("storageKey");--> statement-breakpoint
CREATE UNIQUE INDEX "files_completion_idempotency_key_unique" ON "files" USING btree ("completionIdempotencyKey");--> statement-breakpoint
CREATE INDEX "files_expiration_cleanup_idx" ON "files" USING btree ("expiresAt") WHERE "files"."deletedAt" is null and "files"."expiresAt" is not null;--> statement-breakpoint
CREATE INDEX "files_pending_cleanup_idx" ON "files" USING btree ("uploadExpiresAt") WHERE "files"."status" = 'pending';--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "documentFileIds";--> statement-breakpoint
ALTER TABLE "checklist_item_photos" ADD CONSTRAINT "checklist_item_photos_position_check" CHECK ("checklist_item_photos"."position" between 1 and 20);--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_storage_key_not_blank_check" CHECK (btrim("files"."storageKey") <> '');--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_original_name_not_blank_check" CHECK (btrim("files"."originalName") <> '');--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_checksum_sha256_check" CHECK ("files"."checksumSha256" ~ '^[a-f0-9]{64}$');--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_lifecycle_check" CHECK (("files"."status" = 'pending' and "files"."uploadedAt" is null and "files"."deletedAt" is null) or ("files"."status" = 'uploaded' and "files"."uploadedAt" is not null and "files"."deletedAt" is null) or ("files"."status" = 'failed' and "files"."uploadedAt" is null) or ("files"."status" = 'deleted' and "files"."deletedAt" is not null));