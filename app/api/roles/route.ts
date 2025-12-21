import { getSessionWithPermissions } from '@/lib/session';
import {
  createRoleForUser,
  deleteRoleForUser,
  getRoles,
  updateRoleForUser
} from '@/server/services/roleService';
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
    const result = await getRoles(session.user);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceErrorResponse('Error fetching roles', error);
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
    const result = await createRoleForUser(body, session.user);

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    return handleServiceErrorResponse('Error creating role', error);
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSessionWithPermissions();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const result = await updateRoleForUser(body, session.user);

    return NextResponse.json(result);

  } catch (error) {
    return handleServiceErrorResponse('Error updating role', error);
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionWithPermissions();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  try {
    await deleteRoleForUser(id || '', session.user);
    return NextResponse.json({ message: 'Role deleted successfully' });

  } catch (error) {
    return handleServiceErrorResponse('Error deleting role', error);
  }
}
