import { generateInvoiceNumber } from '@/lib/invoice-utils';
import {
  createInvoice,
  deleteInvoice,
  deleteInvoiceItems,
  findInvoiceWithItems,
  findPatientById,
  findProductById,
  updateInvoice,
} from '@/server/repositories/invoiceRepository';
import { ServiceError } from '@/server/services/serviceErrors';
import { SessionUser } from '@/server/services/types';
import type { Prisma } from '@prisma/client';

export type InvoiceItemInput = {
  productId?: string;
  productName?: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
  discountType?: string;
  isManual?: boolean;
};

export type InvoicePayload = {
  items: InvoiceItemInput[];
  discount?: number;
  discountType?: string;
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
  let totalItemDiscounts = 0;

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
    const itemSubtotal = quantity * unitPrice;
    const itemDiscount = normalizeNumber(item.discount);
    const itemDiscountType = item.discountType || 'percentage';

    let itemDiscountAmount = 0;
    if (itemDiscount > 0) {
      if (itemDiscountType === 'percentage') {
        itemDiscountAmount = (itemSubtotal * itemDiscount) / 100;
      } else {
        itemDiscountAmount = Math.min(itemDiscount, itemSubtotal);
      }
    }

    const total = itemSubtotal - itemDiscountAmount;
    calculatedSubtotal += itemSubtotal;
    totalItemDiscounts += itemDiscountAmount;

    invoiceItems.push({
      productName,
      quantity,
      unitPrice,
      discount: itemDiscount,
      discountType: itemDiscountType,
      discountAmount: itemDiscountAmount,
      total,
      isManual: item.isManual || false,
      product: productId ? { connect: { id: productId } } : undefined,
    });
  }

  return {
    invoiceItems,
    calculatedSubtotal,
    totalItemDiscounts,
  };
}

function calculateDiscounts(
  calculatedSubtotal: number,
  totalItemDiscounts: number,
  discount: number,
  discountType: string
) {
  const subtotalAfterItemDiscounts = calculatedSubtotal - totalItemDiscounts;
  let calculatedDiscountAmount = 0;

  if (discount > 0) {
    if (discountType === 'percentage') {
      calculatedDiscountAmount = (subtotalAfterItemDiscounts * discount) / 100;
    } else {
      calculatedDiscountAmount = Math.min(discount, subtotalAfterItemDiscounts);
    }
  }

  const finalTotal = Math.max(0, calculatedSubtotal - totalItemDiscounts - calculatedDiscountAmount);

  return {
    calculatedDiscountAmount,
    finalTotal,
  };
}

export async function createInvoiceForUser(payload: InvoicePayload, user?: SessionUser) {
  ensureUser(user);
  ensureCanCreateInvoice(user);
  await ensurePatientExists(payload.patientId);

  const discount = normalizeNumber(payload.discount);
  const discountType = payload.discountType || 'percentage';
  const paidAmount = normalizeNumber(payload.paidAmount);

  const { invoiceItems, calculatedSubtotal, totalItemDiscounts } = await buildInvoiceItems(payload.items);
  const { calculatedDiscountAmount, finalTotal } = calculateDiscounts(
    calculatedSubtotal,
    totalItemDiscounts,
    discount,
    discountType
  );

  const invoiceNo = await generateInvoiceNumber();

  return createInvoice(
    {
      invoiceNo,
      branch: payload.branch || undefined,
      corporateId: payload.corporateId || undefined,
      patient: { connect: { id: payload.patientId } },
      user: { connect: { id: user.id } },
      subtotal: calculatedSubtotal,
      discount,
      discountType,
      discountAmount: calculatedDiscountAmount,
      totalAmount: finalTotal,
      paidAmount,
      items: {
        create: invoiceItems,
      },
    },
    invoiceDetailInclude
  );
}

export async function updateInvoiceForUser(payload: InvoicePayload & { id: string }, user?: SessionUser) {
  ensureUser(user);
  ensureCanCreateInvoice(user);
  await ensurePatientExists(payload.patientId);

  if (!payload.id) {
    throw new InvoiceServiceError('Invoice ID is required', 400);
  }

  const existingInvoice = await findInvoiceWithItems(payload.id);

  if (!existingInvoice) {
    throw new InvoiceServiceError('Invoice not found', 404);
  }

  if (!user.permissions?.VIEW_ALL_INVOICES && existingInvoice.createdBy !== user.id) {
    throw new InvoiceServiceError('Unauthorized to update this invoice', 403);
  }

  const discount = normalizeNumber(payload.discount);
  const discountType = payload.discountType || 'percentage';
  const paidAmount = normalizeNumber(payload.paidAmount);

  const { invoiceItems, calculatedSubtotal, totalItemDiscounts } = await buildInvoiceItems(payload.items);
  const { calculatedDiscountAmount, finalTotal } = calculateDiscounts(
    calculatedSubtotal,
    totalItemDiscounts,
    discount,
    discountType
  );

  await deleteInvoiceItems(payload.id);

  return updateInvoice(
    payload.id,
    {
      patient: { connect: { id: payload.patientId } },
      branch: payload.branch || undefined,
      corporateId: payload.corporateId || undefined,
      subtotal: calculatedSubtotal,
      discount,
      discountType,
      discountAmount: calculatedDiscountAmount,
      totalAmount: finalTotal,
      paidAmount,
      updatedAt: new Date(),
      items: {
        create: invoiceItems,
      },
    },
    invoiceDetailInclude
  );
}

export async function deleteInvoiceForUser(id: string, user?: SessionUser) {
  ensureUser(user);

  if (!id) {
    throw new InvoiceServiceError('Invoice ID is required', 400);
  }

  await deleteInvoiceItems(id);
  await deleteInvoice(id);
}
