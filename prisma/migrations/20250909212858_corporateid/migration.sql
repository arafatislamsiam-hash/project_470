/*
  Warnings:

  - You are about to drop the column `patientMobile` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `patientName` on the `invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."invoices" DROP COLUMN "patientMobile",
DROP COLUMN "patientName",
ADD COLUMN     "corporateId" TEXT;
