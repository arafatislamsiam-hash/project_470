import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export function listProducts(params: {
  where?: Prisma.ProductWhereInput;
}) {
  return prisma.product.findMany({
    where: params.where,
    include: {
      category: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export function findProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
}

export function createProduct(
  data: Prisma.ProductCreateInput
) {
  return prisma.product.create({
    data,
    include: {
      category: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
}

export function updateProduct(
  id: string,
  data: Prisma.ProductUpdateInput
) {
  return prisma.product.update({
    where: { id },
    data,
    include: {
      category: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
}

export function deleteProduct(id: string) {
  return prisma.product.delete({
    where: { id },
  });
}

export function countInvoiceItemsForProduct(productId: string) {
  return prisma.invoiceItem.count({
    where: { productId },
  });
}
