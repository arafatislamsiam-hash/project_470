-- CreateTable
CREATE TABLE "performance_targets" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "periodType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "branch" TEXT,
    "team" TEXT,
    "revenueTarget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profitTarget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "performance_targets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "performance_targets"
ADD CONSTRAINT "performance_targets_createdBy_fkey"
FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
