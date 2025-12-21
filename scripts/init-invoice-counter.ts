import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initializeInvoiceCounter() {
  try {
    console.log('🔄 Initializing invoice counter...');

    // Check if counter already exists
    const existingCounter = await prisma.counter.findUnique({
      where: { name: 'invoice_counter' }
    });

    if (existingCounter) {
      console.log(`✅ Invoice counter already exists with value: ${existingCounter.value}`);
      return;
    }

    // Find the highest existing invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      select: {
        invoiceNo: true
      },
      orderBy: {
        invoiceNo: 'desc'
      },
      where: {
        invoiceNo: {
          startsWith: 'INV-'
        }
      }
    });

    let startValue = 0;

    if (lastInvoice && lastInvoice.invoiceNo) {
      // Extract number from invoice number (e.g., "INV-000123" -> 123)
      const match = lastInvoice.invoiceNo.match(/INV-(\d+)/);
      if (match) {
        startValue = parseInt(match[1]);
        console.log(`📊 Found highest existing invoice number: ${lastInvoice.invoiceNo}`);
      }
    }

    // Create the counter with the calculated start value
    await prisma.counter.create({
      data: {
        name: 'invoice_counter',
        value: startValue
      }
    });

    console.log(`✅ Invoice counter initialized with value: ${startValue}`);
    console.log(`🎯 Next invoice will be: INV-${String(startValue + 1).padStart(6, '0')}`);

  } catch (error) {
    console.error('❌ Error initializing invoice counter:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
if (require.main === module) {
  initializeInvoiceCounter()
    .then(() => {
      console.log('🎉 Invoice counter initialization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to initialize invoice counter:', error);
      process.exit(1);
    });
}

export default initializeInvoiceCounter;
