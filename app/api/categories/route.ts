import { NextRequest } from 'next/server';
import { createCategory, listCategories } from '@/server/controllers/categoryController';

export async function GET() {
  return listCategories();
}

export async function POST(request: NextRequest) {
  return createCategory(request);
}
