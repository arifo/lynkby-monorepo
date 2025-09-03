-- Ensure only one active token row per email upsert target
ALTER TABLE "public"."magic_link_tokens"
  ADD CONSTRAINT "magic_link_tokens_email_key" UNIQUE ("email");

