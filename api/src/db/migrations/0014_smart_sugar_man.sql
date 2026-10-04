ALTER TABLE "material_invoices" DROP CONSTRAINT "material_invoices_orderId_material_orders_id_fk";
--> statement-breakpoint
DROP INDEX "material_invoices_order_idx";--> statement-breakpoint
DROP INDEX "material_invoices_order_paid_delivered_idx";--> statement-breakpoint
ALTER TABLE "material_invoices" ADD COLUMN "stageId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "material_invoices" ADD CONSTRAINT "material_invoices_stageId_stages_id_fk" FOREIGN KEY ("stageId") REFERENCES "public"."stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "material_invoices_stage_idx" ON "material_invoices" USING btree ("stageId");--> statement-breakpoint
CREATE INDEX "material_invoices_stage_paid_delivered_idx" ON "material_invoices" USING btree ("stageId","paidAt","deliveredAt");--> statement-breakpoint
ALTER TABLE "material_invoices" DROP COLUMN "orderId";
--> statement-breakpoint
DROP TABLE "material_orders";
