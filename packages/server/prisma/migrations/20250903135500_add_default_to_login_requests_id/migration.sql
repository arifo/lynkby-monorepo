-- Ensure the pgcrypto extension is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Set a database-level default for login_requests.id
-- Existing column is TEXT; Postgres will cast UUID to TEXT automatically
ALTER TABLE "public"."login_requests"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Optional: add helpful indexes if missing (safe with IF NOT EXISTS)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'login_requests_status_expires_idx' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX login_requests_status_expires_idx ON "public"."login_requests" (status, "expiresAt");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'login_requests_userId_idx' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX login_requests_userId_idx ON "public"."login_requests" ("userId");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'login_requests_email_idx' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX login_requests_email_idx ON "public"."login_requests" (email);
  END IF;
END $$;

