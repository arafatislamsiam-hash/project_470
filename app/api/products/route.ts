import { NextRequest } from 'next/server';
import { createProduct, listProducts } from '@/server/controllers/productController';

export async function GET(request: NextRequest) {
  return listProducts(request);
}

export async function POST(request: NextRequest) {
  return createProduct(request);
}
