CREATE TYPE "public"."stage_status" AS ENUM('created', 'assigned', 'supplied', 'started', 'in_progress', 'acceptance', 'completed');--> statement-breakpoint
CREATE TYPE "public"."stage_type" AS ENUM('foundation', 'walls', 'roof', 'windows', 'facade', 'electrical', 'plaster', 'heating');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "projects_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" varchar(255) NOT NULL,
	"ownerName" varchar(255) NOT NULL,
	"address" varchar(1000),
	"latitude" double precision,
	"longitude" double precision,
	"cadastralNumber" varchar(100),
	"houseDesign" varchar(255),
	"contractLabel" varchar(255),
	"dueDate" date,
	"notes" text,
	"isArchived" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_title_not_blank_check" CHECK (btrim("projects"."title") <> ''),
	CONSTRAINT "projects_owner_name_not_blank_check" CHECK (btrim("projects"."ownerName") <> ''),
	CONSTRAINT "projects_address_not_blank_check" CHECK ("projects"."address" is null or btrim("projects"."address") <> ''),
	CONSTRAINT "projects_coordinates_pair_check" CHECK (("projects"."latitude" is null and "projects"."longitude" is null) or ("projects"."latitude" is not null and "projects"."longitude" is not null)),
	CONSTRAINT "projects_latitude_range_check" CHECK ("projects"."latitude" is null or "projects"."latitude" between -90 and 90),
	CONSTRAINT "projects_longitude_range_check" CHECK ("projects"."longitude" is null or "projects"."longitude" between -180 and 180),
	CONSTRAINT "projects_cadastral_number_not_blank_check" CHECK ("projects"."cadastralNumber" is null or btrim("projects"."cadastralNumber") <> ''),
	CONSTRAINT "projects_house_design_not_blank_check" CHECK ("projects"."houseDesign" is null or btrim("projects"."houseDesign") <> ''),
	CONSTRAINT "projects_contract_label_not_blank_check" CHECK ("projects"."contractLabel" is null or btrim("projects"."contractLabel") <> ''),
	CONSTRAINT "projects_notes_not_blank_check" CHECK ("projects"."notes" is null or btrim("projects"."notes") <> ''),
	CONSTRAINT "projects_notes_length_check" CHECK ("projects"."notes" is null or char_length("projects"."notes") <= 5000)
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
CREATE TABLE "stages" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stages_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"projectId" integer NOT NULL,
	"type" "stage_type" NOT NULL,
	"position" integer NOT NULL,
	"workSubtypes" varchar(255)[] DEFAULT '{}'::varchar[] NOT NULL,
	"assigneeId" integer,
	"inspectorId" integer,
	"status" "stage_status" DEFAULT 'created' NOT NULL,
	"plannedStartDate" date,
	"plannedEndDate" date,
	"actualStartDate" date,
	"actualEndDate" date,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stages_project_id_id_unique" UNIQUE("projectId","id"),
	CONSTRAINT "stages_position_check" CHECK ("stages"."position" between 1 and 8),
	CONSTRAINT "stages_type_position_check" CHECK (("stages"."type", "stages"."position") in (('foundation', 1), ('walls', 2), ('roof', 3), ('windows', 4), ('facade', 5), ('electrical', 6), ('plaster', 7), ('heating', 8))),
	CONSTRAINT "stages_work_subtypes_count_check" CHECK (cardinality("stages"."workSubtypes") <= 30),
	CONSTRAINT "stages_work_subtypes_no_null_check" CHECK (array_position("stages"."workSubtypes", null) is null),
	CONSTRAINT "stages_planned_dates_check" CHECK ("stages"."plannedStartDate" is null or "stages"."plannedEndDate" is null or "stages"."plannedEndDate" >= "stages"."plannedStartDate"),
	CONSTRAINT "stages_notes_not_blank_check" CHECK ("stages"."notes" is null or btrim("stages"."notes") <> ''),
	CONSTRAINT "stages_notes_length_check" CHECK ("stages"."notes" is null or char_length("stages"."notes") <= 5000),
	CONSTRAINT "stages_version_check" CHECK ("stages"."version" >= 1)
);
--> statement-breakpoint
ALTER TABLE "stage_predecessors" ADD CONSTRAINT "stage_predecessors_stage_fk" FOREIGN KEY ("projectId","stageId") REFERENCES "public"."stages"("projectId","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_predecessors" ADD CONSTRAINT "stage_predecessors_predecessor_fk" FOREIGN KEY ("projectId","predecessorStageId") REFERENCES "public"."stages"("projectId","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_projectId_projects_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_assigneeId_users_id_fk" FOREIGN KEY ("assigneeId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_inspectorId_users_id_fk" FOREIGN KEY ("inspectorId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_archived_created_at_idx" ON "projects" USING btree ("isArchived","createdAt");--> statement-breakpoint
CREATE INDEX "stage_predecessors_predecessor_idx" ON "stage_predecessors" USING btree ("predecessorStageId");--> statement-breakpoint
CREATE UNIQUE INDEX "stages_project_type_unique" ON "stages" USING btree ("projectId","type");--> statement-breakpoint
CREATE UNIQUE INDEX "stages_project_position_unique" ON "stages" USING btree ("projectId","position");--> statement-breakpoint
CREATE INDEX "stages_assignee_status_idx" ON "stages" USING btree ("assigneeId","status");--> statement-breakpoint
CREATE INDEX "stages_inspector_status_idx" ON "stages" USING btree ("inspectorId","status");--> statement-breakpoint
CREATE INDEX "stages_status_idx" ON "stages" USING btree ("status");