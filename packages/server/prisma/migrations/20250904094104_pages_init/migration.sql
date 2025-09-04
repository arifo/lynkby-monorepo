/*
  Warnings:

  - You are about to drop the column `label` on the `links` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `links` table. All the data in the column will be lost.
  - You are about to alter the column `url` on the `links` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(2048)`.
  - You are about to drop the column `avatarUrl` on the `pages` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `pages` table. All the data in the column will be lost.
  - You are about to drop the column `displayName` on the `pages` table. All the data in the column will be lost.
  - Added the required column `title` to the `links` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Plan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "public"."Layout" AS ENUM ('LINKS_LIST');

-- AlterTable
ALTER TABLE "public"."links" DROP COLUMN "label",
DROP COLUMN "order",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "title" VARCHAR(80) NOT NULL,
ALTER COLUMN "url" SET DATA TYPE VARCHAR(2048);

-- AlterTable
ALTER TABLE "public"."magic_link_tokens" ADD COLUMN     "requestId" TEXT;

-- AlterTable
ALTER TABLE "public"."pages" DROP COLUMN "avatarUrl",
DROP COLUMN "bio",
DROP COLUMN "displayName",
ADD COLUMN     "layout" "public"."Layout" NOT NULL DEFAULT 'LINKS_LIST',
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "theme" VARCHAR(50) NOT NULL DEFAULT 'classic',
ADD COLUMN     "viewsAllTime" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "avatarUrl" VARCHAR(500),
ADD COLUMN     "bio" VARCHAR(280),
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "plan" "public"."Plan" NOT NULL DEFAULT 'FREE';

-- CreateIndex
CREATE INDEX "links_pageId_position_idx" ON "public"."links"("pageId", "position");

-- CreateIndex
CREATE INDEX "magic_link_tokens_email_idx" ON "public"."magic_link_tokens"("email");

-- CreateIndex
CREATE INDEX "magic_link_tokens_expiresAt_idx" ON "public"."magic_link_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "magic_link_tokens_requestId_idx" ON "public"."magic_link_tokens"("requestId");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "public"."user_sessions"("userId");

-- CreateIndex
CREATE INDEX "user_sessions_expiresAt_idx" ON "public"."user_sessions"("expiresAt");

-- RenameIndex
ALTER INDEX "public"."login_requests_userid_idx" RENAME TO "login_requests_userId_idx";
