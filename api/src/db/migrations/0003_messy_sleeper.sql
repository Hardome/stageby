ALTER TABLE "acceptances" DROP CONSTRAINT "acceptances_decision_data_check";--> statement-breakpoint
ALTER TABLE "acceptance_items" ADD COLUMN "comment" varchar(5000) NOT NULL;--> statement-breakpoint
ALTER TABLE "acceptance_items" ADD CONSTRAINT "acceptance_items_comment_not_blank_check" CHECK (btrim("acceptance_items"."comment") <> '');--> statement-breakpoint
ALTER TABLE "acceptances" ADD CONSTRAINT "acceptances_decision_data_check" CHECK (("acceptances"."decision" = 'accepted' and "acceptances"."correctionDueDate" is null) or ("acceptances"."decision" = 'rejected' and "acceptances"."correctionDueDate" is not null));
