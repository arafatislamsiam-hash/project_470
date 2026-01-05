import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export type NotificationType = 'invoice_status' | 'user_assignment';
export type InvoiceStatus = 'unpaid' | 'partial' | 'paid';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  unpaid: 'Unpaid',
  partial: 'Partially Paid',
  paid: 'Paid'
};

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Prisma.InputJsonValue;
};

export const determineInvoiceStatus = (totalAmount: number, paidAmount: number): InvoiceStatus => {
  const normalizedTotal = Math.max(0, Number(totalAmount) || 0);
  const normalizedPaid = Math.max(0, Number(paidAmount) || 0);

  if (normalizedPaid <= 0) {
    return 'unpaid';
  }

  if (normalizedPaid + 0.01 >= normalizedTotal) {
    return 'paid';
  }

  return 'partial';
};

export async function createNotification({
  userId,
  type,
  title,
  message,
  data
}: CreateNotificationInput) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data
      }
    });
  } catch (error) {
    console.error('Failed to create notification', error);
  }
}

export async function notifyInvoiceStatusChange({
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
}) {
  if (!recipientId || recipientId === actorId) {
    return;
  }

  const label = STATUS_LABELS[newStatus] ?? newStatus;

  await createNotification({
    userId: recipientId,
    type: 'invoice_status',
    title: `Invoice ${invoiceNo} ${label}`,
    message: `${actorName ?? 'A team member'} marked this invoice as ${label.toLowerCase()}.`,
    data: {
      invoiceId,
      invoiceNo,
      status: newStatus
    }
  });
}

export async function notifyUserAssignment({
  userId,
  roleName,
  assignedById,
  assignedByName
}: {
  userId: string;
  roleName: string;
  assignedById: string;
  assignedByName?: string | null;
}) {
  if (!userId) {
    return;
  }

  await createNotification({
    userId,
    type: 'user_assignment',
    title: `Assigned to ${roleName}`,
    message: `${assignedByName ?? 'An administrator'} assigned you the ${roleName} role.`,
    data: {
      roleName,
      assignedById
    }
  });
}
