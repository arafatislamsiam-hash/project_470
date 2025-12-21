-- AlterTable
ALTER TABLE "public"."invoice_items" ADD COLUMN     "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountType" TEXT NOT NULL DEFAULT 'percentage';

-- AlterTable
ALTER TABLE "public"."invoices" ADD COLUMN     "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
