/*
  Warnings:

  - You are about to drop the `Link` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Page` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Link" DROP CONSTRAINT "Link_pageId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Page" DROP CONSTRAINT "Page_userId_fkey";

-- DropIndex
DROP INDEX "public"."magic_link_tokens_email_key";

-- DropTable
DROP TABLE "public"."Link";

-- DropTable
DROP TABLE "public"."Page";

-- DropTable
DROP TABLE "public"."User";

-- CreateTable
CREATE TABLE "public"."login_requests" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "userId" TEXT,
    "handshakeNonce" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "login_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "login_requests_requestId_key" ON "public"."login_requests"("requestId");

-- AddForeignKey
ALTER TABLE "public"."login_requests" ADD CONSTRAINT "login_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
