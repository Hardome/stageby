LOCK TABLE "files" IN ACCESS EXCLUSIVE MODE;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "files") THEN
    RAISE EXCEPTION 'Cannot migrate file checksums to MD5: files must be empty. Preserve existing objects and migrate their contents separately.';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "files" DROP CONSTRAINT "files_checksum_sha256_check";--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "checksumMd5" varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "checksumSha256";--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_checksum_md5_check" CHECK ("files"."checksumMd5" ~ '^[a-f0-9]{32}$');
