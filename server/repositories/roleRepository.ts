import { prisma } from '@/lib/db';

export function listRoles() {
  return prisma.role.findMany({
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: { name: 'asc' },
  });
}

export function findRoleByName(name: string) {
  return prisma.role.findUnique({
    where: { name },
  });
}

export function findRoleById(id: string) {
  return prisma.role.findUnique({
    where: { id },
  });
}

export function createRole(data: { name: string; description?: string; permissions: string }) {
  return prisma.role.create({
    data,
  });
}

export function updateRole(id: string, data: { name: string; description?: string; permissions: string }) {
  return prisma.role.update({
    where: { id },
    data,
  });
}

export function deleteRole(id: string) {
  return prisma.role.delete({
    where: { id },
  });
}

export function findUsersWithRole(id: string) {
  return prisma.user.findMany({
    where: { roles: { some: { id } } },
  });
}
