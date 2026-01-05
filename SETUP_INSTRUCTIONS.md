# Setup Instructions for Patient Management System

This document provides step-by-step instructions to set up and deploy the new Patient Management System.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Prisma CLI installed globally (`npm install -g prisma`)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

#### For New Installations

1. Set up your environment variables in `.env`:
```bash
DATABASE_URL="your-postgresql-connection-string"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

2. Generate Prisma client and push schema:
```bash
npx prisma generate
npx prisma db push
```

3. Seed the database with initial data:
```bash
npx prisma db seed
```

#### For Existing Installations (Migration Required)

1. **IMPORTANT: Backup your database before proceeding!**

2. Update your environment variables if needed.

3. Generate the new Prisma client:
```bash
npx prisma generate
```

4. Apply the database changes:
```bash
npx prisma db push
```

5. Run the migration script to convert existing invoice data:
```bash
node scripts/migrate-to-patients.js
```

6. Verify the migration was successful:
```bash
# Check that all invoices have patient references
npx prisma studio
```

### 3. Role and Permission Setup

After the database is set up, you need to ensure users have the correct permissions:

1. **For System Administrators**: The `MANAGE_PATIENT` permission should be `true`
2. **For Regular Users**: The `MANAGE_PATIENT` permission should be `false` by default

#### Update Existing Admin Users

If you have existing admin users, you may need to update their role permissions to include `MANAGE_PATIENT`. You can do this through:

1. **Database directly**:
```sql
UPDATE roles 
SET permissions = jsonb_set(permissions::jsonb, '{MANAGE_PATIENT}', 'true')
WHERE name = 'Admin' OR name = 'System Admin';
```

2. **Or through the application**: Use the user management interface to update role permissions.

### 4. Development Server

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### 5. Production Deployment

#### Environment Variables

Set the following environment variables in your production environment:

```bash
DATABASE_URL="your-production-postgresql-url"
NEXTAUTH_SECRET="your-secure-nextauth-secret"
NEXTAUTH_URL="your-production-domain"
```

#### Build and Deploy

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## Feature Verification

After setup, verify that the new features are working:

### 1. Patient Management
- [ ] Navigate to `/patients` (requires `MANAGE_PATIENT` permission)
- [ ] Create a new patient
- [ ] Edit patient information
- [ ] Search for patients
- [ ] Delete patients (should prevent if they have invoices)

### 2. Invoice Creation
- [ ] Navigate to `/invoices/create`
- [ ] Test "New Patient" button (requires `MANAGE_PATIENT` permission)
- [ ] Test "Existing Patient" button with mobile search
- [ ] Create invoice with selected patient
- [ ] Verify patient appears correctly in invoice

### 3. Invoice Editing
- [ ] Edit an existing invoice
- [ ] Change the patient associated with the invoice
- [ ] Verify changes are saved correctly

### 4. Permissions
- [ ] Test that users without `MANAGE_PATIENT` permission cannot access patient management
- [ ] Test that users without `MANAGE_PATIENT` permission get proper error messages

## Troubleshooting

### Common Issues

#### 1. "Property 'patient' does not exist" Error
This occurs when Prisma client hasn't been regenerated after schema changes.
```bash
npx prisma generate
```

#### 2. Migration Script Fails
- Ensure your database connection is working
- Verify you have existing invoices with patient data
- Check the console output for specific error messages

#### 3. Permission Denied Errors
- Verify user roles have the correct permissions
- Check that `MANAGE_PATIENT` is included in admin role permissions
- Restart the application after permission changes

#### 4. Patient Search Not Working
- Ensure the patient API endpoints are accessible
- Check browser developer tools for API errors
- Verify database has patient records

### Database Issues

#### Reset Database (Development Only)
If you need to completely reset the database:
```bash
npx prisma migrate reset
npx prisma generate
npx prisma db seed
```

#### Manual Migration Verification
Check that the migration completed successfully:
```sql
-- Count patients created
SELECT COUNT(*) FROM patients;

-- Count invoices with patient references
SELECT COUNT(*) FROM invoices WHERE patientId IS NOT NULL;

-- Count invoices without patient references (should be 0 after migration)
SELECT COUNT(*) FROM invoices WHERE patientId IS NULL AND patientName IS NOT NULL;
```

## Data Migration Details

The migration script (`scripts/migrate-to-patients.js`) performs these steps:

1. **Extracts unique patients** from existing invoices based on name and mobile
2. **Creates patient records** in the new patients table
3. **Links existing invoices** to the appropriate patient records
4. **Verifies the migration** by checking all invoices have patient references

The script is idempotent and can be run multiple times safely.

## Rollback Procedure

If you need to rollback the changes:

1. **Remove patient references from invoices**:
```sql
UPDATE invoices SET patientId = NULL;
```

2. **Drop the patients table**:
```sql
DROP TABLE patients;
```

3. **Restore the old schema** by reverting the Prisma schema file

4. **Regenerate Prisma client**:
```bash
npx prisma generate
npx prisma db push
```

## Support

If you encounter issues during setup:

1. Check the application logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure database connectivity and permissions
4. Review the migration script output for any failures

For additional support, refer to:
- `IMPLEMENTATION_SUMMARY.md` for technical details
- `MIGRATION_INSTRUCTIONS.md` for detailed migration steps
- Application logs in the browser developer tools