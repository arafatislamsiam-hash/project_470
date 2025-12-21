import { getSessionWithPermissions } from '@/lib/session';
import { createUserForSession, getUsersForSession } from '@/server/services/userService';
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
    const result = await getUsersForSession(session.user);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceErrorResponse('Error fetching users', error);
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
    const result = await createUserForSession(body, session.user);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    return handleServiceErrorResponse('Error creating user', error);
  }
}
