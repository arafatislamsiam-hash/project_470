import { getSessionWithPermissions } from '@/lib/session';
import { createInvoiceForUser } from '@/server/services/invoiceService';
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
