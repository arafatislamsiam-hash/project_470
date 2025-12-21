/*
  Warnings:

  - Made the column `patientId` on table `invoices` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."invoices" DROP CONSTRAINT "invoices_patientId_fkey";

-- AlterTable
ALTER TABLE "public"."invoices" ALTER COLUMN "patientId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
