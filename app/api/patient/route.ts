import { getSessionWithPermissions } from '@/lib/session';
import {
  createPatientForUser,
  deletePatientForUser,
  getPatients,
  updatePatientForUser
} from '@/server/services/patientService';
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
    const result = await createPatientForUser(body, session.user);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    return handleServiceErrorResponse('Error creating patient', error);
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
  const mobile = searchParams.get('mobile');
  const search = searchParams.get('search');

  try {
    const result = await getPatients({ mobile, search }, session.user);
    return NextResponse.json(result);
  } catch (error) {
    return handleServiceErrorResponse('Error fetching patients', error);
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
    const result = await updatePatientForUser(body, session.user);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    return handleServiceErrorResponse('Error updating patient', error);
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

  try {
    const body = await request.json();
    await deletePatientForUser(body.id, session.user);

    return NextResponse.json({
      success: true,
      message: 'Patient deleted successfully'
    });

  } catch (error) {
    return handleServiceErrorResponse('Error deleting patient', error);
  }
}
