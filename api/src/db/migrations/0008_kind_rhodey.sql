CREATE TYPE "public"."file_status" AS ENUM('pending', 'uploaded', 'failed', 'deleted');--> statement-breakpoint
CREATE TABLE "checklist_item_photos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "checklist_item_photos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"checklistItemId" integer NOT NULL,
	"fileId" integer NOT NULL,
	"deletedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "files_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"status" "file_status" DEFAULT 'pending' NOT NULL,
	"mimeType" varchar(255) NOT NULL,
	"sizeBytes" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_mime_type_not_blank_check" CHECK (btrim("files"."mimeType") <> ''),
	CONSTRAINT "files_size_bytes_check" CHECK ("files"."sizeBytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "material_invoices" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "material_invoices_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"orderId" integer NOT NULL,
	"deliveredAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "material_orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"stageId" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_payments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "work_payments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"stageId" integer NOT NULL,
	"amountMinor" bigint NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "work_payments_amount_check" CHECK ("work_payments"."amountMinor" > 0)
);
--> statement-breakpoint
ALTER TABLE "checklist_item_photos" ADD CONSTRAINT "checklist_item_photos_checklistItemId_checklist_items_id_fk" FOREIGN KEY ("checklistItemId") REFERENCES "public"."checklist_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_item_photos" ADD CONSTRAINT "checklist_item_photos_fileId_files_id_fk" FOREIGN KEY ("fileId") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_orderId_material_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."material_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_orders" ADD CONSTRAINT "material_orders_stageId_stages_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_payments" ADD CONSTRAINT "work_payments_stageId_stages_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_item_photos_file_unique" ON "checklist_item_photos" USING btree ("fileId");--> statement-breakpoint
CREATE INDEX "material_invoices_order_idx" ON "material_invoices" USING btree ("orderId");--> statement-breakpoint
CREATE INDEX "material_orders_stage_idx" ON "material_orders" USING btree ("stageId");--> statement-breakpoint
CREATE INDEX "work_payments_stage_idx" ON "work_payments" USING btree ("stageId");