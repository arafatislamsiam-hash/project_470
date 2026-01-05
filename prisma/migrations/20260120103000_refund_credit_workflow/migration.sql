-- AlterTable
ALTER TABLE "invoices"
    ADD COLUMN     "creditAppliedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN     "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" TEXT NOT NULL,
    "creditNo" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "remainingAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_note_applications" (
    "id" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "appliedInvoiceId" TEXT NOT NULL,
    "appliedAmount" DECIMAL(10,2) NOT NULL,
    "appliedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_note_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_note_history" (
    "id" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_note_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_creditNo_key" ON "credit_notes"("creditNo");

-- CreateIndex
CREATE INDEX "credit_notes_invoiceId_idx" ON "credit_notes"("invoiceId");

-- CreateIndex
CREATE INDEX "credit_notes_patientId_idx" ON "credit_notes"("patientId");

-- CreateIndex
CREATE INDEX "credit_note_applications_creditNoteId_idx" ON "credit_note_applications"("creditNoteId");

-- CreateIndex
CREATE INDEX "credit_note_applications_appliedInvoiceId_idx" ON "credit_note_applications"("appliedInvoiceId");

-- CreateIndex
CREATE INDEX "credit_note_history_creditNoteId_idx" ON "credit_note_history"("creditNoteId");

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_issuedBy_fkey" FOREIGN KEY ("issuedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_applications" ADD CONSTRAINT "credit_note_applications_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_applications" ADD CONSTRAINT "credit_note_applications_appliedInvoiceId_fkey" FOREIGN KEY ("appliedInvoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_applications" ADD CONSTRAINT "credit_note_applications_appliedBy_fkey" FOREIGN KEY ("appliedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_note_history" ADD CONSTRAINT "credit_note_history_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "credit_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
