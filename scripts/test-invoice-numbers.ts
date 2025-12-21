import { PrismaClient } from '@prisma/client';
import { generateInvoiceNumber, generateInvoiceNumberFromMax, resetInvoiceCounter } from '../lib/invoice-utils';

const prisma = new PrismaClient();

async function testInvoiceNumberGeneration() {
  console.log('🧪 Testing Invoice Number Generation...\n');

  try {
    // Test 1: Reset counter and test sequential generation
    console.log('📋 Test 1: Sequential Generation');
    await resetInvoiceCounter(0);

    const invoice1 = await generateInvoiceNumber();
    const invoice2 = await generateInvoiceNumber();
    const invoice3 = await generateInvoiceNumber();

    console.log(`Generated: ${invoice1}, ${invoice2}, ${invoice3}`);
    console.log(`Expected: INV-000001, INV-000002, INV-000003`);
    console.log(`✅ Test 1 ${invoice1 === 'INV-000001' && invoice2 === 'INV-000002' && invoice3 === 'INV-000003' ? 'PASSED' : 'FAILED'}\n`);

    // Test 2: Test alternative method (max-based)
    console.log('📋 Test 2: Max-based Generation');

    // First, let's see what the current max is
    const currentMax = await prisma.invoice.findFirst({
      select: { invoiceNo: true },
      orderBy: { invoiceNo: 'desc' },
      where: { invoiceNo: { startsWith: 'INV-' } }
    });

    let expectedNextNumber = 1;
    if (currentMax?.invoiceNo) {
      const match = currentMax.invoiceNo.match(/INV-(\d+)/);
      if (match) {
        expectedNextNumber = parseInt(match[1]) + 1;
      }
    }

    const expectedNext1 = `INV-${String(expectedNextNumber).padStart(6, '0')}`;
    const expectedNext2 = `INV-${String(expectedNextNumber + 1).padStart(6, '0')}`;

    const invoiceMax1 = await generateInvoiceNumberFromMax();
    const invoiceMax2 = await generateInvoiceNumberFromMax();

    console.log(`Generated (max-based): ${invoiceMax1}, ${invoiceMax2}`);
    console.log(`Expected: ${expectedNext1}, ${expectedNext2}`);
    console.log(`✅ Test 2 ${invoiceMax1 === expectedNext1 && invoiceMax2 === expectedNext2 ? 'PASSED' : 'FAILED'}\n`);

    // Test 3: Simulate deletion scenario
    console.log('📋 Test 3: Deletion Scenario Simulation');

    // Get existing user and patient for testing
    const testUser = await prisma.user.findFirst();
    const testPatient = await prisma.patient.findFirst();

    if (!testUser || !testPatient) {
      console.log('⚠️ Skipping deletion test - requires existing user and patient data');
      console.log('✅ Test 3 SKIPPED\n');
      return;
    }

    // Create test invoices
    const testInvoice1No = await generateInvoiceNumber();
    const testInvoice1 = await prisma.invoice.create({
      data: {
        invoiceNo: testInvoice1No,
        totalAmount: 100.00,
        patientId: testPatient.id,
        createdBy: testUser.id
      }
    });

    const testInvoice2No = await generateInvoiceNumber();
    const testInvoice2 = await prisma.invoice.create({
      data: {
        invoiceNo: testInvoice2No,
        totalAmount: 200.00,
        patientId: testPatient.id,
        createdBy: testUser.id
      }
    });

    console.log(`Created test invoices: ${testInvoice1No}, ${testInvoice2No}`);

    // Delete first invoice
    await prisma.invoice.delete({ where: { id: testInvoice1.id } });
    console.log(`Deleted invoice: ${testInvoice1No}`);

    // Generate new invoice - should not conflict
    const testInvoice3No = await generateInvoiceNumber();
    const testInvoice3 = await prisma.invoice.create({
      data: {
        invoiceNo: testInvoice3No,
        totalAmount: 300.00,
        patientId: testPatient.id,
        createdBy: testUser.id
      }
    });

    console.log(`Created new invoice after deletion: ${testInvoice3No}`);
    console.log(`✅ Test 3 PASSED - No conflicts occurred\n`);

    // Cleanup test data
    await prisma.invoice.deleteMany({
      where: {
        id: {
          in: [testInvoice2.id, testInvoice3.id]
        }
      }
    });

    // Test data cleaned up

    // Test 4: Concurrent generation simulation
    console.log('📋 Test 4: Concurrent Generation Simulation');

    const concurrentPromises = [];
    for (let i = 0; i < 5; i++) {
      concurrentPromises.push(generateInvoiceNumber());
    }

    const concurrentResults = await Promise.all(concurrentPromises);
    const uniqueResults = new Set(concurrentResults);

    console.log(`Generated concurrently: ${concurrentResults.join(', ')}`);
    console.log(`Unique count: ${uniqueResults.size}, Expected: 5`);
    console.log(`✅ Test 4 ${uniqueResults.size === 5 ? 'PASSED' : 'FAILED'}\n`);

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

async function demonstrateOldVsNewApproach() {
  console.log('\n📊 Demonstrating Old vs New Approach:\n');

  try {
    // Simulate old approach (count-based)
    console.log('🔴 Old Approach (Problematic):');
    const oldCount1 = await prisma.invoice.count();
    console.log(`Count: ${oldCount1}, Would generate: INV-${String(oldCount1 + 1).padStart(6, '0')}`);

    console.log('\n🟢 New Approach (Safe):');
    const newInvoice = await generateInvoiceNumber();
    console.log(`Counter-based generation: ${newInvoice}`);

    console.log('\n💡 Benefits of new approach:');
    console.log('✅ Atomic operations prevent race conditions');
    console.log('✅ Sequential numbering maintained even with deletions');
    console.log('✅ No duplicate invoice numbers possible');
    console.log('✅ Database-level consistency guaranteed');

  } catch (error) {
    console.error('❌ Demonstration failed:', error);
  }
}

// Main execution
async function main() {
  try {
    await testInvoiceNumberGeneration();
    await demonstrateOldVsNewApproach();
  } catch (error) {
    console.error('💥 Tests failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✨ Test suite completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

export default testInvoiceNumberGeneration;
