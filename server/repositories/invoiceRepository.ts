import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export async function findPatientById(id: string) {
  return prisma.patient.findUnique({
    where: { id },
  });
}

export async function findProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
  });
}

export async function createInvoice(
  data: Prisma.InvoiceCreateInput,
  include?: Prisma.InvoiceInclude
) {
  return prisma.invoice.create({
    data,
    include,
  });
}

export async function updateInvoice(
  id: string,
  data: Prisma.InvoiceUpdateInput,
  include?: Prisma.InvoiceInclude
) {
  return prisma.invoice.update({
    where: { id },
    data,
    include,
  });
}

export async function findInvoiceWithItems(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: { items: true },
  });
}

export async function deleteInvoiceItems(invoiceId: string) {
  return prisma.invoiceItem.deleteMany({
    where: { invoiceId },
  });
}

export async function deleteInvoice(id: string) {
  return prisma.invoice.delete({
    where: { id },
  });
}

export async function findInvoicesPaged(params: {
  skip: number;
  take: number;
  where?: Prisma.InvoiceWhereInput;
  include?: Prisma.InvoiceInclude;
}) {
  const { skip, take, where, include } = params;
  const invoices = await prisma.invoice.findMany({
    skip,
    take,
    where,
    include,
    orderBy: { createdAt: 'desc' },
  });

  const totalInvoices = await prisma.invoice.count({
    where,
  });

  return {
    invoices,
    totalInvoices,
  };
}
