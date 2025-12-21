import { getSessionWithPermissions } from '@/lib/session';
import { changePasswordForUser } from '@/server/services/profileService';
import { handleServiceErrorResponse } from '@/server/utils/handleServiceErrorResponse';
import { NextRequest, NextResponse } from 'next/server';

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
    await changePasswordForUser(body, session.user);

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    return handleServiceErrorResponse('Error changing password', error);
  }
}
