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
ALTER TABLE "material_invoices" ADD COLUMN "fileId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD COLUMN "supplierName" varchar(255);--> statement-breakpoint
ALTER TABLE "material_invoices" ADD COLUMN "amountMinor" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD COLUMN "paidAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD COLUMN "paidByUserId" integer;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD COLUMN "deliveredByUserId" integer;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD COLUMN "updatedAt" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "material_orders" ADD COLUMN "sentAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "material_orders" ADD COLUMN "sentByUserId" integer;--> statement-breakpoint
ALTER TABLE "material_orders" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "material_orders" ADD COLUMN "updatedAt" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "material_shortages" ADD CONSTRAINT "material_shortages_invoiceId_material_invoices_id_fk" FOREIGN KEY ("invoiceId") REFERENCES "public"."material_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_shortages" ADD CONSTRAINT "material_shortages_reportedByUserId_users_id_fk" FOREIGN KEY ("reportedByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_shortages" ADD CONSTRAINT "material_shortages_resolvedByUserId_users_id_fk" FOREIGN KEY ("resolvedByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "material_shortages_invoice_idx" ON "material_shortages" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "material_shortages_open_idx" ON "material_shortages" USING btree ("invoiceId") WHERE "material_shortages"."resolvedAt" is null;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_fileId_files_id_fk" FOREIGN KEY ("fileId") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_paidByUserId_users_id_fk" FOREIGN KEY ("paidByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_deliveredByUserId_users_id_fk" FOREIGN KEY ("deliveredByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_orders" ADD CONSTRAINT "material_orders_sentByUserId_users_id_fk" FOREIGN KEY ("sentByUserId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "material_invoices_order_paid_delivered_idx" ON "material_invoices" USING btree ("orderId","paidAt","deliveredAt");--> statement-breakpoint
CREATE UNIQUE INDEX "material_invoices_file_unique" ON "material_invoices" USING btree ("fileId");--> statement-breakpoint
CREATE INDEX "material_orders_sent_idx" ON "material_orders" USING btree ("sentAt");--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_supplier_not_blank_check" CHECK ("material_invoices"."supplierName" is null or btrim("material_invoices"."supplierName") <> '');--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_amount_check" CHECK ("material_invoices"."amountMinor" > 0 and "material_invoices"."amountMinor" % 100 = 0);--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_paid_author_check" CHECK (("material_invoices"."paidAt" is null and "material_invoices"."paidByUserId" is null) or ("material_invoices"."paidAt" is not null and "material_invoices"."paidByUserId" is not null));--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_delivered_author_check" CHECK (("material_invoices"."deliveredAt" is null and "material_invoices"."deliveredByUserId" is null) or ("material_invoices"."deliveredAt" is not null and "material_invoices"."deliveredByUserId" is not null));--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_version_check" CHECK ("material_invoices"."version" >= 1);--> statement-breakpoint
ALTER TABLE "material_orders" ADD CONSTRAINT "material_orders_sent_author_check" CHECK (("material_orders"."sentAt" is null and "material_orders"."sentByUserId" is null) or ("material_orders"."sentAt" is not null and "material_orders"."sentByUserId" is not null));--> statement-breakpoint
ALTER TABLE "material_orders" ADD CONSTRAINT "material_orders_version_check" CHECK ("material_orders"."version" >= 1);