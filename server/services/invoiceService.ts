import { generateInvoiceNumber } from '@/lib/invoice-utils';
import {
  createInvoice,
  findPatientById,
  findProductById,
} from '@/server/repositories/invoiceRepository';
import { ServiceError } from '@/server/services/serviceErrors';
import { SessionUser } from '@/server/services/types';
import type { Prisma } from '@prisma/client';

export type InvoiceItemInput = {
  productId?: string;
  productName?: string;
  quantity: number;
  unitPrice?: number;
  isManual?: boolean;
};

export type InvoicePayload = {
  items: InvoiceItemInput[];
  patientId: string;
  branch?: string | null;
  paidAmount?: number;
  corporateId?: string | null;
};

const invoiceDetailInclude: Prisma.InvoiceInclude = {
  patient: true,
  items: {
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
  },
  user: {
    select: {
      name: true,
      email: true,
    },
  },
};

export class InvoiceServiceError extends ServiceError { }

function ensureUser(user?: SessionUser): asserts user is SessionUser {
  if (!user?.id) {
    throw new InvoiceServiceError('Unauthorized', 401);
  }
}

function ensureCanCreateInvoice(user: SessionUser) {
  if (!user.permissions?.CREATE_INVOICE) {
    throw new InvoiceServiceError('Unauthorized', 401);
  }
}

async function ensurePatientExists(patientId: string) {
  if (!patientId) {
    throw new InvoiceServiceError('Patient ID is required', 400);
  }

  const patient = await findPatientById(patientId);

  if (!patient) {
    throw new InvoiceServiceError('Patient not found', 404);
  }

  return patient;
}

function normalizeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

async function buildInvoiceItems(items: InvoiceItemInput[]) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new InvoiceServiceError('Invoice items are required', 400);
  }

  const invoiceItems: Prisma.InvoiceItemCreateWithoutInvoiceInput[] = [];
  let calculatedSubtotal = 0;

  for (const item of items) {
    let productId: string | null = null;
    let unitPrice = 0;
    let productName = '';

    if (item.productId && !item.isManual) {
      const product = await findProductById(item.productId);

      if (!product) {
        throw new InvoiceServiceError(`Product not found: ${item.productId}`, 400);
      }

      productId = product.id;
      unitPrice = parseFloat(product.price.toString());
      productName = product.name;
    } else {
      unitPrice = parseFloat(String(item.unitPrice ?? 0));
      productName = item.productName ?? '';
    }

    const quantity = normalizeNumber(item.quantity);
    const total = quantity * unitPrice;
    calculatedSubtotal += total;

    invoiceItems.push({
      productName,
      quantity,
      unitPrice,
      total,
      isManual: item.isManual || false,
      product: productId ? { connect: { id: productId } } : undefined,
    });
  }

  return {
    invoiceItems,
    calculatedSubtotal,
  };
}

export async function createInvoiceForUser(payload: InvoicePayload, user?: SessionUser) {
  ensureUser(user);
  ensureCanCreateInvoice(user);
  await ensurePatientExists(payload.patientId);

  const paidAmount = normalizeNumber(payload.paidAmount);
  const { invoiceItems, calculatedSubtotal } = await buildInvoiceItems(payload.items);

  const invoiceNo = await generateInvoiceNumber();

  return createInvoice(
    {
      invoiceNo,
      branch: payload.branch || undefined,
      corporateId: payload.corporateId || undefined,
      patient: { connect: { id: payload.patientId } },
      user: { connect: { id: user.id } },
      subtotal: calculatedSubtotal,
      discount: 0,
      discountType: 'percentage',
      discountAmount: 0,
      totalAmount: calculatedSubtotal,
      paidAmount,
      items: {
        create: invoiceItems,
      },
    },
    invoiceDetailInclude
  );
}
