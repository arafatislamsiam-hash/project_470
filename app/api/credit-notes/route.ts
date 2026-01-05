import { generateCreditNoteNumber, recordCreditNoteHistory } from '@/lib/credit-notes';
import { prisma } from '@/lib/db';
import { determineInvoiceStatus, notifyInvoiceStatusChange } from '@/lib/notifications';
import { getSessionWithPermissions } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const patientId = searchParams.get('patientId');
    const invoiceId = searchParams.get('invoiceId');
    const status = searchParams.get('status');
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    const where = {
      ...(patientId ? { patientId } : {}),
      ...(invoiceId ? { invoiceId } : {}),
      ...(status ? { status } : {})
    };

    const [creditNotes, total] = await Promise.all([
      prisma.creditNote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNo: true
            }
          },
          patient: {
            select: {
              id: true,
              patientName: true
            }
          },
          applications: {
            include: {
              appliedInvoice: {
                select: {
                  id: true,
                  invoiceNo: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          ...(includeHistory
            ? {
              history: {
                orderBy: { createdAt: 'desc' }
              }
            }
            : {})
        }
      }),
      prisma.creditNote.count({ where })
    ]);

    return NextResponse.json({
      creditNotes,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching credit notes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session || !session.user?.permissions?.CREATE_INVOICE) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invoiceId, amount, reason, notes } = body as {
      invoiceId?: string;
      amount?: number;
      reason?: string;
      notes?: string;
    };

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNo: true,
        patientId: true,
        createdBy: true,
        totalAmount: true,
        paidAmount: true,
        creditAppliedAmount: true,
        refundedAmount: true,
        status: true
      }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!session.user.permissions.VIEW_ALL_INVOICES && invoice.createdBy !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const maxRefundable = Math.max(
      0,
      Number(invoice.totalAmount) - Number(invoice.refundedAmount ?? 0)
    );

    if (maxRefundable <= 0) {
      return NextResponse.json({ error: 'Invoice has no refundable balance' }, { status: 400 });
    }

    if (numericAmount - 0.01 > maxRefundable) {
      return NextResponse.json({ error: 'Refund amount exceeds available balance' }, { status: 400 });
    }

    const creditNo = await generateCreditNoteNumber();
    const totalAmount = Number(numericAmount.toFixed(2));
    const updatedRefundedAmount = Number(invoice.refundedAmount ?? 0) + totalAmount;
    const creditType = totalAmount + 0.01 >= maxRefundable ? 'full' : 'partial';

    const updatedStatus = determineInvoiceStatus(
      Number(invoice.totalAmount),
      Number(invoice.paidAmount ?? 0),
      Number(invoice.creditAppliedAmount ?? 0),
      updatedRefundedAmount
    );

    const creditNote = await prisma.$transaction(async (tx) => {
      const created = await tx.creditNote.create({
        data: {
          creditNo,
          invoiceId,
          patientId: invoice.patientId,
          issuedBy: session.user.id,
          type: creditType,
          reason: reason ?? null,
          notes: notes ?? null,
          status: 'open',
          totalAmount,
          remainingAmount: totalAmount
        },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNo: true
            }
          },
          patient: {
            select: {
              id: true,
              patientName: true
            }
          }
        }
      });

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          refundedAmount: updatedRefundedAmount,
          status: updatedStatus
        }
      });

      await recordCreditNoteHistory(
        {
          creditNoteId: created.id,
          action: 'created',
          actorId: session.user.id,
          metadata: {
            invoiceId,
            amount: totalAmount,
            reason: reason ?? null
          }
        },
        tx
      );

      return created;
    });

    if (invoice.status !== updatedStatus) {
      await notifyStatusChange({
        invoiceId: invoice.id,
        invoiceNo: invoice.invoiceNo,
        newStatus: updatedStatus,
        actorId: session.user.id,
        actorName: session.user.name,
        recipientId: invoice.createdBy
      });
    }

    return NextResponse.json({
      success: true,
      creditNote
    });
  } catch (error) {
    console.error('Error creating credit note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const notifyStatusChange = async ({
  invoiceId,
  invoiceNo,
  newStatus,
  actorId,
  actorName,
  recipientId
}: {
  invoiceId: string;
  invoiceNo: string;
  newStatus: string;
  actorId: string;
  actorName?: string | null;
  recipientId?: string | null;
}) => {
  if (!recipientId) {
    return;
  }

  await notifyInvoiceStatusChange({
    invoiceId,
    invoiceNo,
    newStatus,
    actorId,
    actorName,
    recipientId
  });
};
