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
ALTER TABLE "checklist_items" DROP CONSTRAINT "checklist_items_position_check";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_coordinates_pair_check";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_address_not_blank_check";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_latitude_range_check";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_longitude_range_check";--> statement-breakpoint
ALTER TABLE "stages" DROP CONSTRAINT "stages_type_position_check";--> statement-breakpoint
ALTER TABLE "stages" DROP CONSTRAINT "stages_planned_dates_check";--> statement-breakpoint
ALTER TABLE "stages" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "stages" ALTER COLUMN "status" SET DEFAULT 'created'::text;--> statement-breakpoint
DROP TYPE "public"."stage_status";--> statement-breakpoint
CREATE TYPE "public"."stage_status" AS ENUM('created', 'assigned', 'supplied', 'in_progress', 'acceptance', 'rework', 'completed', 'paid');--> statement-breakpoint
ALTER TABLE "stages" ALTER COLUMN "status" SET DEFAULT 'created'::"public"."stage_status";--> statement-breakpoint
ALTER TABLE "stages" ALTER COLUMN "status" SET DATA TYPE "public"."stage_status" USING "status"::"public"."stage_status";--> statement-breakpoint
DROP INDEX "stages_project_type_unique";--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "address" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "latitude" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "longitude" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stages" ALTER COLUMN "plannedStartDate" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stages" ALTER COLUMN "plannedEndDate" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN "photoHint" varchar(1000);--> statement-breakpoint
ALTER TABLE "checklist_items" ADD COLUMN "requiresRework" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "plannedStartDate" date NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "plannedEndDate" date NOT NULL;--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN "stageTypeCode" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN "canRunInParallel" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN "plannedWorkAmountMinor" bigint;--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN "plannedMaterialAmountMinor" bigint;--> statement-breakpoint
ALTER TABLE "checklist_template_items" ADD CONSTRAINT "checklist_template_items_checklistTemplateId_checklist_templates_id_fk" FOREIGN KEY ("checklistTemplateId") REFERENCES "public"."checklist_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_stageTypeCode_stage_types_code_fk" FOREIGN KEY ("stageTypeCode") REFERENCES "public"."stage_types"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_template_items_template_position_unique" ON "checklist_template_items" USING btree ("checklistTemplateId","position");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_templates_active_stage_type_unique" ON "checklist_templates" USING btree ("stageTypeCode") WHERE "checklist_templates"."isActive";--> statement-breakpoint
CREATE UNIQUE INDEX "stage_types_position_unique" ON "stage_types" USING btree ("position");--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_stageTypeCode_stage_types_code_fk" FOREIGN KEY ("stageTypeCode") REFERENCES "public"."stage_types"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stages_project_type_unique" ON "stages" USING btree ("projectId","stageTypeCode");--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_photo_hint_not_blank_check" CHECK ("checklist_items"."photoHint" is null or btrim("checklist_items"."photoHint") <> '');--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_position_check" CHECK ("checklist_items"."position" > 0);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_planned_dates_check" CHECK ("projects"."plannedEndDate" >= "projects"."plannedStartDate");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_address_not_blank_check" CHECK (btrim("projects"."address") <> '');--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_latitude_range_check" CHECK ("projects"."latitude" between -90 and 90);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_longitude_range_check" CHECK ("projects"."longitude" between -180 and 180);--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_planned_work_amount_check" CHECK ("stages"."plannedWorkAmountMinor" is null or "stages"."plannedWorkAmountMinor" >= 0);--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_planned_material_amount_check" CHECK ("stages"."plannedMaterialAmountMinor" is null or "stages"."plannedMaterialAmountMinor" >= 0);--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_planned_dates_check" CHECK ("stages"."plannedEndDate" >= "stages"."plannedStartDate");--> statement-breakpoint
INSERT INTO "stage_types" ("code", "title", "position") VALUES
	('foundation', 'Фундамент', 1),
	('walls', 'Стены', 2),
	('roof', 'Крыша', 3),
	('windows', 'Окна', 4),
	('facade', 'Фасад', 5),
	('electrical', 'Электрика', 6),
	('finishing', 'Отделка', 7),
	('heating', 'Отопление', 8);--> statement-breakpoint
INSERT INTO "checklist_templates" ("stageTypeCode")
	SELECT "code" FROM "stage_types" ORDER BY "position";--> statement-breakpoint
INSERT INTO "checklist_template_items" ("checklistTemplateId", "title", "photoHint", "position")
	SELECT template."id", item."title", item."photoHint", item."position"
	FROM "checklist_templates" template
	JOIN (
		VALUES
			('foundation', 1, 'Подготовка котлована и канализации', 'Котлован должен войти во весь кадр с двух сторон'),
			('foundation', 2, 'Армирование', 'Фото перевязки всех углов и перехлёста арматуры'),
			('foundation', 3, 'Тёплые полы', 'Фото развязки тёплого пола и вывода в коллекторные группы'),
			('foundation', 4, 'Бетонные работы и укрытие бетона плёнкой', 'Фото фундамента с двух сторон'),
			('walls', 1, 'Стартовый ряд, армировка стартового ряда', 'Фото армировки и первого ряда'),
			('walls', 2, 'Кладка до первой армировки', 'Фото кладки'),
			('walls', 3, 'Кладка до второй армировки', 'Фото кладки'),
			('walls', 4, 'Кладка до третьего ряда армировки', 'Фото кладки'),
			('walls', 5, 'Армопояс', 'Фото армировки армопояса'),
			('roof', 1, 'Мауэрлат', 'Фото крепления мауэрлата'),
			('roof', 2, 'Лаги, стропила', 'Фото крепления лаг и стропил'),
			('roof', 3, 'Пароизоляция', 'Фото крыши со всех сторон'),
			('roof', 4, 'Утепление', 'Фото утеплителя'),
			('roof', 5, 'Ветрозащита и обрешётка', 'Фото ветрозащиты с обрешёткой'),
			('roof', 6, 'Кровельное покрытие', 'Фото кровли со всех сторон'),
			('roof', 7, 'Лобовые, торцевые планки', 'Фото планок'),
			('windows', 1, 'Установка окон', 'Фото каждого окна'),
			('windows', 2, 'Установка дверей', 'Фото каждой двери'),
			('facade', 1, 'Утепление', 'Фото утеплителя'),
			('facade', 2, 'Армировка', 'Фото армировки'),
			('facade', 3, 'Фасадное покрытие', 'Фото фасада со всех сторон'),
			('electrical', 1, 'Электрика', 'Фото разводки, розеток и щита'),
			('finishing', 1, 'Армировка штукатурных углов, проёмов', 'Фото углов и проёмов'),
			('finishing', 2, 'Штукатурка', 'Фото всех стен'),
			('heating', 1, 'Установка котлов и коллекторов', 'Фото соединений, котлов и коллекторов')
	) AS item("stageTypeCode", "position", "title", "photoHint")
		ON item."stageTypeCode" = template."stageTypeCode";--> statement-breakpoint
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
