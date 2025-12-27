import { getSessionWithPermissions } from '@/lib/session';
import {
  deleteProductForUser,
  getProductById,
  updateProductForUser
} from '@/server/services/productService';
import { handleServiceErrorResponse } from '@/server/utils/handleServiceErrorResponse';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSessionWithPermissions();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await getProductById(params.id, session.user);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceErrorResponse('Error fetching product', error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getSessionWithPermissions();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const result = await updateProductForUser(params.id, body, session.user);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    return handleServiceErrorResponse('Error updating product', error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSessionWithPermissions();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await deleteProductForUser(params.id, session.user);

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    return handleServiceErrorResponse('Error deleting product', error);
  }
}
