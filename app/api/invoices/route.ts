import { getSessionWithPermissions } from '@/lib/session';
import {
  createInvoiceForUser,
  deleteInvoiceForUser,
  listInvoicesForUser,
  updateInvoiceForUser
} from '@/server/services/invoiceService';
import { handleServiceErrorResponse } from '@/server/utils/handleServiceErrorResponse';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const session = await getSessionWithPermissions();

  if (!session || !session.user?.permissions?.CREATE_INVOICE) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const invoice = await createInvoiceForUser(body, session.user);

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error) {
    return handleServiceErrorResponse('Error creating invoice', error);
  }
}

export async function GET(request: NextRequest) {
  const session = await getSessionWithPermissions();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    const result = await listInvoicesForUser({ page, limit }, session.user);

    return NextResponse.json(result);
  } catch (error) {
    return handleServiceErrorResponse('Error fetching invoices', error);
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSessionWithPermissions();

  if (!session || !session.user?.permissions?.CREATE_INVOICE) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const invoice = await updateInvoiceForUser(body, session.user);

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error) {
    return handleServiceErrorResponse('Error updating invoice', error);
  }
}

export async function DELETE(request: Request) {
  const session = await getSessionWithPermissions();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json();

  const { id } = body;

  try {
    await deleteInvoiceForUser(id, session.user);

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully'
    });

  } catch (error) {
    return handleServiceErrorResponse('Error deleting invoice', error);
  }
}
