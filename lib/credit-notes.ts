import { prisma } from '@/lib/db';
import type { Prisma, PrismaClient } from '@prisma/client';

const CREDIT_NOTE_COUNTER_KEY = 'credit_note_counter';

export type CreditNoteHistoryAction = 'created' | 'applied' | 'released' | 'voided';
type PrismaClientOrTx = PrismaClient | Prisma.TransactionClient;

export async function generateCreditNoteNumber(): Promise<string> {
  const counter = await prisma.counter.upsert({
    where: { name: CREDIT_NOTE_COUNTER_KEY },
    update: {
      value: {
        increment: 1
      }
    },
    create: {
      name: CREDIT_NOTE_COUNTER_KEY,
      value: 1
    }
  });

  return `CN-${String(counter.value).padStart(6, '0')}`;
}

export const resolveCreditNoteStatus = (remainingAmount: number, totalAmount: number): string => {
  if (remainingAmount <= 0) {
    return 'closed';
  }

  if (remainingAmount < totalAmount) {
    return 'partial';
  }

  return 'open';
};

export async function recordCreditNoteHistory(
  {
    creditNoteId,
    action,
    actorId,
    metadata
  }: {
    creditNoteId: string;
    action: CreditNoteHistoryAction;
    actorId?: string | null;
    metadata?: Prisma.InputJsonValue;
  },
  client: PrismaClientOrTx = prisma
) {
  await client.creditNoteHistory.create({
    data: {
      creditNoteId,
      action,
      actorId: actorId ?? null,
      metadata
    }
  });
}
