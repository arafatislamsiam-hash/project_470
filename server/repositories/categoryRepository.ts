import { prisma } from '@/lib/db';

export function listCategories() {
  return prisma.category.findMany({
    orderBy: [
      { isDefault: 'desc' },
      { title: 'asc' },
    ],
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });
}

export function findCategoryByTitle(title: string) {
  return prisma.category.findUnique({
    where: { title },
  });
}

export function findCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
  });
}

export function createCategory(data: { title: string; description?: string | null; isDefault?: boolean }) {
  return prisma.category.create({
    data,
  });
}
