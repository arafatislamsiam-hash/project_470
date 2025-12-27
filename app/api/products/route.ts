import { getSessionWithPermissions } from '@/lib/session';
import { createProductForUser, getProducts } from '@/server/services/productService';
import { handleServiceErrorResponse } from '@/server/utils/handleServiceErrorResponse';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getSessionWithPermissions();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const categoryId = searchParams.get('categoryId') || undefined;

  try {
    const result = await getProducts({ categoryId }, session.user);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceErrorResponse('Error fetching products', error);
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionWithPermissions();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const result = await createProductForUser(body, session.user);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    return handleServiceErrorResponse('Error creating product', error);
  }
}
