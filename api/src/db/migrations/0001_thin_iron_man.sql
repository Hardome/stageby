CREATE TYPE "public"."user_role" AS ENUM('manager', 'estimator', 'foreman', 'inspector');--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"tokenHash" varchar(64) NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"revokedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_format_check" CHECK ("sessions"."tokenHash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "sessions_expiry_check" CHECK ("sessions"."expiresAt" > "sessions"."createdAt"),
	CONSTRAINT "sessions_revoked_at_check" CHECK ("sessions"."revokedAt" is null or "sessions"."revokedAt" >= "sessions"."createdAt")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"login" varchar(64) NOT NULL,
	"passwordHash" varchar(512) NOT NULL,
	"fullName" varchar(255) NOT NULL,
	"role" "user_role" NOT NULL,
	"phone" varchar(32),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_login_format_check" CHECK ("users"."login" ~ '^[a-z0-9][a-z0-9._-]{2,63}$'),
	CONSTRAINT "users_password_hash_not_blank_check" CHECK (btrim("users"."passwordHash") <> ''),
	CONSTRAINT "users_full_name_not_blank_check" CHECK (btrim("users"."fullName") <> ''),
	CONSTRAINT "users_phone_not_blank_check" CHECK ("users"."phone" is null or btrim("users"."phone") <> '')
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("tokenHash");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "users_login_unique" ON "users" USING btree ("login");--> statement-breakpoint
CREATE INDEX "users_role_active_idx" ON "users" USING btree ("role","isActive");