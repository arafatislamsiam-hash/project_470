-- AlterTable
ALTER TABLE "public"."invoices" ADD COLUMN     "patientId" TEXT,
ALTER COLUMN "patientName" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."patients" (
    "id" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientMobile" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_patientMobile_key" ON "public"."patients"("patientMobile");

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
