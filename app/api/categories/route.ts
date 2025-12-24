import { getSessionWithPermissions } from '@/lib/session';
import { createCategoryForUser, getCategories } from '@/server/services/categoryService';
import { handleServiceErrorResponse } from '@/server/utils/handleServiceErrorResponse';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await getSessionWithPermissions();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await getCategories(session.user);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceErrorResponse('Error fetching categories', error);
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
    const result = await createCategoryForUser(body, session.user);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    return handleServiceErrorResponse('Error creating category', error);
  }
}
