/*
  Warnings:

  - You are about to drop the column `corporateId` on the `invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."invoices" DROP COLUMN "corporateId",
ADD COLUMN     "branch" TEXT;
