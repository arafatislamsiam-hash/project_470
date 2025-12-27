import { findCategoryById } from '@/server/repositories/categoryRepository';
import {
  countInvoiceItemsForProduct,
  createProduct,
  deleteProduct,
  findProductById,
  listProducts,
  updateProduct,
} from '@/server/repositories/productRepository';
import { ServiceError } from '@/server/services/serviceErrors';
import { SessionUser } from '@/server/services/types';

type ProductPayload = {
  name: string;
  price: number;
  description?: string | null;
  categoryId: string;
};

function ensureUser(user?: SessionUser): asserts user is SessionUser {
  if (!user?.id) {
    throw new ServiceError('Unauthorized', 401);
  }
}

function ensureCanManageProducts(user: SessionUser) {
  if (!user.permissions?.MANAGE_PRODUCTS) {
    throw new ServiceError('Unauthorized', 401);
  }
}

function normalizePrice(price: unknown) {
  const parsed = Number(price);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ServiceError('Price must be a positive number', 400);
  }
  return parsed;
}

export async function getProducts(params: { categoryId?: string }, user?: SessionUser) {
  ensureUser(user);

  const where = params.categoryId ? { categoryId: params.categoryId } : undefined;
  const products = await listProducts({ where });

  return { products };
}

export async function getProductById(id: string, user?: SessionUser) {
  ensureUser(user);

  const product = await findProductById(id);
  if (!product) {
    throw new ServiceError('Product not found', 404);
  }

  return { product };
}

export async function createProductForUser(payload: ProductPayload, user?: SessionUser) {
  ensureUser(user);
  ensureCanManageProducts(user);

  if (!payload.name) {
    throw new ServiceError('Name and price are required', 400);
  }

  const price = normalizePrice(payload.price);

  const category = await findCategoryById(payload.categoryId);
  if (!category) {
    throw new ServiceError('Category not found', 400);
  }

  const product = await createProduct({
    name: payload.name,
    price,
    description: payload.description || null,
    category: {
      connect: { id: payload.categoryId },
    },
  });

  return { product };
}

export async function updateProductForUser(id: string, payload: ProductPayload, user?: SessionUser) {
  ensureUser(user);
  ensureCanManageProducts(user);

  if (!payload.name) {
    throw new ServiceError('Name and price are required', 400);
  }

  const price = normalizePrice(payload.price);

  const existingProduct = await findProductById(id);
  if (!existingProduct) {
    throw new ServiceError('Product not found', 404);
  }

  const category = await findCategoryById(payload.categoryId);
  if (!category) {
    throw new ServiceError('Category not found', 400);
  }

  const product = await updateProduct(id, {
    name: payload.name,
    price,
    description: payload.description || null,
    category: { connect: { id: payload.categoryId } },
  });

  return { product };
}

export async function deleteProductForUser(id: string, user?: SessionUser) {
  ensureUser(user);
  ensureCanManageProducts(user);

  const existingProduct = await findProductById(id);
  if (!existingProduct) {
    throw new ServiceError('Product not found', 404);
  }

  const invoiceCount = await countInvoiceItemsForProduct(id);
  if (invoiceCount > 0) {
    throw new ServiceError('Cannot delete product that is used in invoices', 400);
  }

  await deleteProduct(id);
}
