import { prisma } from '@/lib/db';

export async function getDashboardCounts() {
  const [totalUsers, totalProducts, totalCategories, totalInvoices] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.category.count(),
    prisma.invoice.count(),
  ]);

  return {
    totalUsers,
    totalProducts,
    totalCategories,
    totalInvoices,
  };
}

export async function getRecentInvoices(take: number) {
  return prisma.invoice.findMany({
    take,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true } },
      items: {
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
}
