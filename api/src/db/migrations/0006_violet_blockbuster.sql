ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "documentFileIds" integer[] DEFAULT '{}'::integer[] NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_document_file_ids_positive_check" CHECK (0 < all("projects"."documentFileIds"));
