/*
  Warnings:

  - You are about to drop the `login_requests` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."login_requests" DROP CONSTRAINT "login_requests_userId_fkey";

-- DropTable
DROP TABLE "public"."login_requests";
