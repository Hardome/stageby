ALTER TABLE "users" ADD COLUMN "passwordResetRequestedAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "work_payments" ADD COLUMN "recipientId" integer;--> statement-breakpoint
ALTER TABLE "work_payments" ADD CONSTRAINT "work_payments_recipientId_users_id_fk" FOREIGN KEY ("recipientId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;