ALTER TABLE "groups" ALTER COLUMN "currency" SET DATA TYPE char(3);--> statement-breakpoint
ALTER TABLE "expense_splits" ADD COLUMN "group_id" uuid;--> statement-breakpoint
UPDATE "expense_splits" SET "group_id" = "expenses"."group_id" FROM "expenses" WHERE "expense_splits"."expense_id" = "expenses"."id";--> statement-breakpoint
ALTER TABLE "expense_splits" ALTER COLUMN "group_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_id_group_unique" UNIQUE("id","group_id");--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_member_fk" FOREIGN KEY ("group_id","user_id") REFERENCES "public"."memberships"("group_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expense_group_fk" FOREIGN KEY ("expense_id","group_id") REFERENCES "public"."expenses"("id","group_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_amount_non_negative" CHECK ("expense_splits"."amount_minor" >= 0);--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_amount_positive" CHECK ("expenses"."amount_minor" > 0);--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_amount_positive" CHECK ("settlements"."amount_minor" > 0);--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_distinct_parties" CHECK ("settlements"."from_user_id" <> "settlements"."to_user_id");