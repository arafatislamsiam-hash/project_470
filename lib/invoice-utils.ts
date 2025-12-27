import { prisma } from '@/lib/db';

/**
 * Generates the next invoice number safely using atomic counter increment
 * This ensures unique invoice numbers even when invoices are deleted
 */
export async function generateInvoiceNumber(): Promise<string> {
  try {
    // Use atomic increment to get the next invoice number
    const counter = await prisma.counter.upsert({
      where: {
        name: 'invoice_counter'
      },
      update: {
        value: {
          increment: 1
        }
      },
      create: {
        name: 'invoice_counter',
        value: 1
      }
    });

    // Format the invoice number with padding
    const invoiceNo = `INV-${String(counter.value).padStart(6, '0')}`;

    return invoiceNo;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    throw new Error('Failed to generate invoice number');
  }
}

/**
 * Alternative method: Find the highest existing invoice number and increment
 * This is useful as a fallback or if you prefer not to use a counter table
 * Note: This method is not recommended for high-concurrency scenarios
 */
export async function generateInvoiceNumberFromMax(): Promise<string> {
  try {
    // Get the highest existing invoice number
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

    let nextNumber = 1;

    if (lastInvoice && lastInvoice.invoiceNo) {
      // Extract number from invoice number (e.g., "INV-000123" -> 123)
      const match = lastInvoice.invoiceNo.match(/INV-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    const invoiceNo = `INV-${String(nextNumber).padStart(6, '0')}`;

    return invoiceNo;
  } catch (error) {
    console.error('Error generating invoice number from max:', error);
    throw new Error('Failed to generate invoice number');
  }
}



/**
 * Validates invoice number format
 */
export function validateInvoiceNumber(invoiceNo: string): boolean {
  const pattern = /^INV-\d{6}$/;
  return pattern.test(invoiceNo);
}

/**
 * Resets the invoice counter (use with caution)
 * This should only be used for testing or data migration purposes
 */
export async function resetInvoiceCounter(startValue: number = 0): Promise<void> {
  try {
    await prisma.counter.upsert({
      where: {
        name: 'invoice_counter'
      },
      update: {
        value: startValue
      },
      create: {
        name: 'invoice_counter',
        value: startValue
      }
    });
  } catch (error) {
    console.error('Error resetting invoice counter:', error);
    throw new Error('Failed to reset invoice counter');
  }
}
