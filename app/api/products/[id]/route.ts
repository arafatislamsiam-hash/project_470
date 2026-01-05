import { NextRequest } from 'next/server';
import {
  deleteProduct,
  getProduct,
  updateProduct
} from '@/server/controllers/productController';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, ctx: RouteParams) {
  return getProduct(request, ctx);
}

export async function PUT(request: NextRequest, ctx: RouteParams) {
  return updateProduct(request, ctx);
}

export async function DELETE(request: NextRequest, ctx: RouteParams) {
  return deleteProduct(request, ctx);
}
