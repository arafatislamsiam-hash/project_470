import { Prisma, PrismaClient } from '@prisma/client';

const toDelegateName = (modelName: string) => modelName.charAt(0).toLowerCase() + modelName.slice(1);
const expectedDelegates = new Set(Prisma.dmmf.datamodel.models.map((model) => toDelegateName(model.name)));

const hasAllDelegates = (client: PrismaClient | undefined) => {
  if (!client) {
    return false;
  }

  const clientRecord = client as unknown as Record<string, unknown>;
  return Array.from(expectedDelegates).every((delegate) => typeof clientRecord[delegate] !== 'undefined');
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const existingClient = globalForPrisma.prisma;
const shouldReuseClient = hasAllDelegates(existingClient);

export const prisma = shouldReuseClient ? existingClient! : new PrismaClient();

if (!shouldReuseClient && existingClient) {
  existingClient.$disconnect().catch(() => null);
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
