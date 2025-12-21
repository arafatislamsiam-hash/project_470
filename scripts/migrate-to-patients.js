const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateToPatients() {
  console.log('Starting migration to patient system...');

  try {
    // Step 1: Get all existing invoices with patient data
    const existingInvoices = await prisma.invoice.findMany({
      where: {
        patientName: {
          not: null
        }
      },
      select: {
        id: true,
        patientName: true,
        patientMobile: true
      }
    });

    console.log(`Found ${existingInvoices.length} invoices to migrate`);

    // Step 2: Create unique patients from existing invoice data
    const uniquePatients = new Map();

    existingInvoices.forEach(invoice => {
      const key = `${invoice.patientName}_${invoice.patientMobile || ''}`;
      if (!uniquePatients.has(key)) {
        uniquePatients.set(key, {
          patientName: invoice.patientName,
          patientMobile: invoice.patientMobile || ''
        });
      }
    });

    console.log(`Creating ${uniquePatients.size} unique patients...`);

    // Step 3: Create patients
    const createdPatients = [];
    for (const [key, patientData] of uniquePatients) {
      try {
        const patient = await prisma.patient.create({
          data: {
            patientName: patientData.patientName,
            patientMobile: patientData.patientMobile
          }
        });
        createdPatients.push(patient);
        console.log(`Created patient: ${patient.patientName} (${patient.patientMobile})`);
      } catch (error) {
        if (error.code === 'P2002') {
          // Patient with this mobile already exists, find and use it
          const existingPatient = await prisma.patient.findUnique({
            where: { patientMobile: patientData.patientMobile }
          });
          if (existingPatient) {
            createdPatients.push(existingPatient);
            console.log(`Using existing patient: ${existingPatient.patientName} (${existingPatient.patientMobile})`);
          }
        } else {
          throw error;
        }
      }
    }

    // Step 4: Update invoices with patientId
    console.log('Updating invoices with patient references...');
    let updatedCount = 0;

    for (const invoice of existingInvoices) {
      const patient = createdPatients.find(p =>
        p.patientName === invoice.patientName &&
        p.patientMobile === (invoice.patientMobile || '')
      );

      if (patient) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { patientId: patient.id }
        });
        updatedCount++;
        console.log(`Updated invoice ${invoice.id} with patient ${patient.id}`);
      } else {
        console.warn(`Could not find patient for invoice ${invoice.id}`);
      }
    }

    console.log(`Successfully migrated ${updatedCount} invoices`);

    // Step 5: Verify migration
    const invoicesWithoutPatients = await prisma.invoice.count({
      where: {
        patientId: null,
        patientName: { not: null }
      }
    });

    if (invoicesWithoutPatients > 0) {
      console.warn(`Warning: ${invoicesWithoutPatients} invoices still don't have patient references`);
    } else {
      console.log('✅ All invoices successfully linked to patients');
    }

    const totalPatients = await prisma.patient.count();
    console.log(`Total patients in database: ${totalPatients}`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateToPatients()
    .then(() => {
      console.log('Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateToPatients };
