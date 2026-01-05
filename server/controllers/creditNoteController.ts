import { generateCreditNoteNumber, recordCreditNoteHistory, resolveCreditNoteStatus } from '@/lib/credit-notes';
import type { InvoiceStatus } from '@/lib/notifications';
import { determineInvoiceStatus, notifyInvoiceStatusChange } from '@/lib/notifications';
import { getSessionWithPermissions } from '@/lib/session';
import { prisma } from '@/server/models';
import { NextRequest, NextResponse } from 'next/server';

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
  newStatus: InvoiceStatus;
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

export async function listCreditNotes(request: NextRequest) {
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
            orderBy: { createdAt: 'desc' }
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

export async function createCreditNote(request: NextRequest) {
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

    const maxRefundable = Math.max(0, Number(invoice.totalAmount) - Number(invoice.refundedAmount ?? 0));

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

    return NextResponse.json({ success: true, creditNote });
  } catch (error) {
    console.error('Error creating credit note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function applyCreditNote(request: NextRequest) {
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

    return NextResponse.json({ success: true, application: applicationRecord });
  } catch (error) {
    console.error('Error applying credit note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
