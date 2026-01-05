# Database Migration Instructions

This document outlines the steps needed to migrate your existing database to support the new Patient management system.

## Overview
The migration adds a new `Patient` table and modifies the `Invoice` table to reference patients instead of storing patient data directly.

## Manual Migration Steps

### Step 1: Create the Patient Table
Run this SQL command in your database:

```sql
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientMobile" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patients_patientMobile_key" ON "patients"("patientMobile");
```

### Step 2: Migrate Existing Invoice Data
This step creates patient records from existing invoices and links them:

```sql
-- Insert unique patients from existing invoices
INSERT INTO "patients" ("id", "patientName", "patientMobile", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text as id,
    "patientName",
    COALESCE("patientMobile", '') as "patientMobile",
    CURRENT_TIMESTAMP as "createdAt",
    CURRENT_TIMESTAMP as "updatedAt"
FROM "invoices" 
WHERE "patientName" IS NOT NULL
GROUP BY "patientName", COALESCE("patientMobile", '');
```

### Step 3: Add patientId Column to Invoices
```sql
-- Add the patientId column
ALTER TABLE "invoices" ADD COLUMN "patientId" TEXT;
```

### Step 4: Populate patientId in Existing Invoices
```sql
-- Update existing invoices with patientId
UPDATE "invoices" 
SET "patientId" = p."id"
FROM "patients" p 
WHERE "invoices"."patientName" = p."patientName" 
AND COALESCE("invoices"."patientMobile", '') = p."patientMobile";
```

### Step 5: Add Foreign Key Constraint
```sql
-- Add foreign key constraint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patientId_fkey" 
FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

### Step 6: Make patientId Required (After Verification)
After verifying all invoices have been properly linked:

```sql
-- Make patientId NOT NULL
ALTER TABLE "invoices" ALTER COLUMN "patientId" SET NOT NULL;
```

### Step 7: Clean Up Old Columns (Optional)
After everything is working properly, you can remove the old columns:

```sql
-- Remove old patient columns from invoices
ALTER TABLE "invoices" DROP COLUMN "patientName";
ALTER TABLE "invoices" DROP COLUMN "patientMobile";
```

## Verification Steps

1. Check that all patients were created:
```sql
SELECT COUNT(*) FROM "patients";
```

2. Check that all invoices have patientId:
```sql
SELECT COUNT(*) FROM "invoices" WHERE "patientId" IS NULL;
-- This should return 0
```

3. Verify the relationship works:
```sql
SELECT i."invoiceNo", p."patientName", p."patientMobile" 
FROM "invoices" i 
JOIN "patients" p ON i."patientId" = p."id" 
LIMIT 5;
```

## Using Prisma (Alternative)

If you prefer to use Prisma, you can:

1. Update your schema to the new version
2. Run: `npx prisma db push` to apply changes
3. Run the data migration SQL manually
4. Run: `npx prisma generate` to update the client

## Rollback Plan

If you need to rollback:

1. Drop the foreign key constraint
2. Drop the patientId column from invoices
3. Drop the patients table
4. Your original schema will be restored

## Notes

- Make sure to backup your database before running these migrations
- Test the migration on a copy of your production database first
- The migration preserves all existing invoice data
- New invoices will be created with the patient relationship system