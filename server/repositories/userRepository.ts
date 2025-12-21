import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });
}

export function createUser(data: Prisma.UserCreateInput) {
  return prisma.user.create({
    data,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      roles: {
        select: {
          role: {
            select: {
              name: true,
              description: true,
            },
          },
        },
      },
    },
  });
}

export function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      roles: {
        select: {
          role: {
            select: {
              name: true,
              description: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export function updateUserPasswordByEmail(email: string, password: string) {
  return prisma.user.update({
    where: { email },
    data: { password },
  });
}
