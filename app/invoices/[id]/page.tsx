import InvoiceView from '@/components/invoice-view';
import Navigation from '@/components/navigation';
import { prisma } from '@/lib/db';
import { getSessionWithPermissions } from '@/lib/session';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const session = await getSessionWithPermissions();
  const { id } = await params;

  if (!session) {
    return null;
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
          patientMobile: true,
          patientId: true
        }
      },
      appointment: {
        select: {
          id: true,
          appointmentDate: true,
          status: true,
          reason: true,
          branch: true
        }
      },
      creditNotes: {
        include: {
          applications: {
            include: {
              appliedInvoice: {
                select: {
                  id: true,
                  invoiceNo: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!invoice) {
    notFound();
  }

  // Check if user can view this invoice
  if (!session.user?.permissions?.VIEW_ALL_INVOICES && invoice.createdBy !== session.user?.id) {
    notFound();
  }

  const appliedCreditRecords = await prisma.creditNoteApplication.findMany({
    where: { appliedInvoiceId: id },
    include: {
      creditNote: {
        select: {
          id: true,
          creditNo: true
        }
      }
    }
  });

  // Convert Decimal objects to numbers for client component
  const serializedInvoice = {
    ...invoice,
    patientId: invoice.patient.patientId,
    corporateId: invoice.corporateId || '',
    branch: invoice.branch || '',
    patientName: invoice.patient.patientName,
    patientMobile: invoice.patient.patientMobile,
    subtotal: Number(invoice.subtotal),
    discount: Number(invoice.discount),
    discountAmount: Number(invoice.discountAmount),
    totalAmount: Number(invoice.totalAmount),
    paidAmount: Number((invoice).paidAmount || 0),
    status: invoice.status,
    creditAppliedAmount: Number(invoice.creditAppliedAmount ?? 0),
    refundedAmount: Number(invoice.refundedAmount ?? 0),
    appliedCredits: appliedCreditRecords.map((record) => ({
      id: record.id,
      creditNoteId: record.creditNoteId,
      creditNo: record.creditNote?.creditNo ?? record.creditNoteId,
      amount: Number(record.appliedAmount)
    })),
    creditNotes: invoice.creditNotes.map((note) => ({
      id: note.id,
      creditNo: note.creditNo,
      type: note.type,
      status: note.status,
      reason: note.reason,
      notes: note.notes,
      totalAmount: Number(note.totalAmount),
      remainingAmount: Number(note.remainingAmount),
      createdAt: note.createdAt.toISOString(),
      applications: note.applications.map((application) => ({
        id: application.id,
        appliedInvoiceId: application.appliedInvoiceId,
        appliedAmount: Number(application.appliedAmount),
        appliedInvoiceNo: application.appliedInvoice?.invoiceNo ?? ''
      }))
    })),
    appointment: invoice.appointment ? {
      id: invoice.appointment.id,
      status: invoice.appointment.status,
      appointmentDate: invoice.appointment.appointmentDate.toISOString(),
      reason: invoice.appointment.reason,
      branch: invoice.appointment.branch
    } : null,
    items: invoice.items.map(item => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount || 0),
      discountType: item.discountType || 'percentage',
      discountAmount: Number(item.discountAmount || 0),
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

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <InvoiceView invoice={serializedInvoice} />
        </div>
      </div>
    </div>
  );
}
