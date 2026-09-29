ALTER TABLE "projects" DROP CONSTRAINT "projects_title_not_blank_check";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "dueDate";--> statement-breakpoint
ALTER TABLE "stages" DROP COLUMN "type";--> statement-breakpoint
DROP TYPE "public"."stage_type";
