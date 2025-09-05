/*
  Warnings:

  - You are about to drop the `magic_link_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."magic_link_tokens" DROP CONSTRAINT "magic_link_tokens_email_fkey";

-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "isVerified" SET DEFAULT true;

-- DropTable
DROP TABLE "public"."magic_link_tokens";

-- CreateTable
CREATE TABLE "public"."otp_tokens" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "codeHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "ipCreatedFrom" TEXT,
    "uaCreatedFrom" TEXT,

    CONSTRAINT "otp_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."setup_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstSaveCompleted" BOOLEAN NOT NULL DEFAULT false,
    "checklist" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setup_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "otp_tokens_codeHash_key" ON "public"."otp_tokens"("codeHash");

-- CreateIndex
CREATE INDEX "otp_tokens_email_idx" ON "public"."otp_tokens"("email");

-- CreateIndex
CREATE INDEX "otp_tokens_expiresAt_idx" ON "public"."otp_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "otp_tokens_consumedAt_idx" ON "public"."otp_tokens"("consumedAt");

-- CreateIndex
CREATE UNIQUE INDEX "setup_states_userId_key" ON "public"."setup_states"("userId");

-- CreateIndex
CREATE INDEX "setup_states_userId_idx" ON "public"."setup_states"("userId");

-- AddForeignKey
ALTER TABLE "public"."otp_tokens" ADD CONSTRAINT "otp_tokens_email_fkey" FOREIGN KEY ("email") REFERENCES "public"."users"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."setup_states" ADD CONSTRAINT "setup_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
