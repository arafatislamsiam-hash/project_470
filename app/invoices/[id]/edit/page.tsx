import EditInvoiceClient from '@/components/edit-invoice-client';
import Navigation from '@/components/navigation';
import { prisma } from '@/lib/db';
import { getSessionWithPermissions } from '@/lib/session';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditInvoicePage({ params }: PageProps) {
  const session = await getSessionWithPermissions();
  const { id } = await params;

  if (!session) {
    return null;
  }

  if (!session.user?.permissions?.CREATE_INVOICE) {
    notFound();
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      },
      user: {
        select: {
          name: true,
          email: true
        }
      },
      patient: {
        select: {
          id: true,
          patientName: true,
          patientMobile: true
        }
      }
    }
  });

  if (!invoice) {
    notFound();
  }

  // Check if user can edit this invoice (either created by them or has VIEW_ALL_INVOICES permission)
  if (!session.user.permissions.VIEW_ALL_INVOICES && invoice.createdBy !== session.user.id) {
    notFound();
  }

  // Convert Decimal objects to numbers for client component
  const serializedInvoice = {
    ...invoice,
    patient: {
      id: invoice.patient.id,
      patientName: invoice.patient.patientName,
      patientMobile: invoice.patient.patientMobile
    },
    branch: invoice.branch || "",
    corporateId: invoice.corporateId || "",
    subtotal: Number(invoice.subtotal),
    discount: Number(invoice.discount),
    discountAmount: Number(invoice.discountAmount),
    totalAmount: Number(invoice.totalAmount),
    paidAmount: Number(invoice.paidAmount),
    items: invoice.items.map(item => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount),
      discountAmount: Number(item.discountAmount),
      total: Number(item.total),
      product: item.product ? {
        ...item.product,
        price: Number(item.product.price)
      } : null
    }))
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <EditInvoiceClient invoice={serializedInvoice} />
        </div>
      </div>
    </div>
  );
}
