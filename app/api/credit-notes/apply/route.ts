import { recordCreditNoteHistory, resolveCreditNoteStatus } from '@/lib/credit-notes';
import { prisma } from '@/lib/db';
import { determineInvoiceStatus, notifyInvoiceStatusChange } from '@/lib/notifications';
import { getSessionWithPermissions } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session || !session.user?.permissions?.CREATE_INVOICE) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { creditNoteId, invoiceId, amount } = body as {
      creditNoteId?: string;
      invoiceId?: string;
      amount?: number;
    };

    if (!creditNoteId || !invoiceId) {
      return NextResponse.json({ error: 'Credit note ID and invoice ID are required' }, { status: 400 });
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }

    const [creditNote, invoice] = await Promise.all([
      prisma.creditNote.findUnique({
        where: { id: creditNoteId },
        select: {
          id: true,
          creditNo: true,
          patientId: true,
          status: true,
          remainingAmount: true,
          totalAmount: true
        }
      }),
      prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: {
          id: true,
          invoiceNo: true,
          patientId: true,
          totalAmount: true,
          paidAmount: true,
          creditAppliedAmount: true,
          refundedAmount: true,
          status: true,
          createdBy: true
        }
      })
    ]);

    if (!creditNote || !invoice) {
      return NextResponse.json({ error: 'Credit note or invoice not found' }, { status: 404 });
    }

    if (creditNote.patientId !== invoice.patientId) {
      return NextResponse.json({ error: 'Credit note and invoice must belong to the same patient' }, { status: 400 });
    }

    if (!session.user.permissions.VIEW_ALL_INVOICES && invoice.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (creditNote.status === 'closed' || Number(creditNote.remainingAmount) <= 0) {
      return NextResponse.json({ error: 'Credit note has no remaining balance' }, { status: 400 });
    }

    const availableCredit = Number(creditNote.remainingAmount);
    const remainingDue = Math.max(
      0,
      Number(invoice.totalAmount) - Number(invoice.paidAmount ?? 0) - Number(invoice.creditAppliedAmount ?? 0)
    );

    if (remainingDue <= 0) {
      return NextResponse.json({ error: 'Invoice has no outstanding balance' }, { status: 400 });
    }

    if (numericAmount - 0.01 > Math.min(availableCredit, remainingDue)) {
      return NextResponse.json({ error: 'Amount exceeds available credit or invoice balance' }, { status: 400 });
    }

    const applicationAmount = Number(numericAmount.toFixed(2));
    const updatedInvoiceStatus = determineInvoiceStatus(
      Number(invoice.totalAmount),
      Number(invoice.paidAmount ?? 0),
      Number(invoice.creditAppliedAmount ?? 0) + applicationAmount,
      Number(invoice.refundedAmount ?? 0)
    );

    const applicationRecord = await prisma.$transaction(async (tx) => {
      await tx.creditNote.update({
        where: { id: creditNoteId },
        data: {
          remainingAmount: availableCredit - applicationAmount,
          status: resolveCreditNoteStatus(availableCredit - applicationAmount, Number(creditNote.totalAmount))
        }
      });

      const appliedRecord = await tx.creditNoteApplication.create({
        data: {
          creditNoteId,
          appliedInvoiceId: invoiceId,
          appliedAmount: applicationAmount,
          appliedBy: session.user.id
        },
        include: {
          creditNote: {
            select: {
              id: true,
              creditNo: true
            }
          },
          appliedInvoice: {
            select: {
              id: true,
              invoiceNo: true
            }
          }
        }
      });

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          creditAppliedAmount: Number(invoice.creditAppliedAmount ?? 0) + applicationAmount,
          status: updatedInvoiceStatus
        }
      });

      await recordCreditNoteHistory(
        {
          creditNoteId,
          action: 'applied',
          actorId: session.user.id,
          metadata: {
            invoiceId,
            amount: applicationAmount
          }
        },
        tx
      );

      return appliedRecord;
    });

    if (invoice.status !== updatedInvoiceStatus) {
      await notifyInvoiceStatusChange({
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
        newStatus: updatedInvoiceStatus,
        actorId: session.user.id,
        actorName: session.user.name,
        recipientId: invoice.createdBy
      });
    }

    return NextResponse.json({
      success: true,
      application: applicationRecord
    });
  } catch (error) {
    console.error('Error applying credit note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
