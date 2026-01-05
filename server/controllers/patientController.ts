import { prisma } from '@/server/models';
import { getSessionWithPermissions } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function createPatient(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session || !session.user?.permissions?.MANAGE_PATIENT) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { patientName, patientMobile } = body;

    if (!patientName || !patientMobile) {
      return NextResponse.json(
        { error: 'Patient name and mobile are required' },
        { status: 400 }
      );
    }

    const existingPatient = await prisma.patient.findUnique({
      where: { patientMobile }
    });

    if (existingPatient) {
      return NextResponse.json(
        { error: 'Patient with this mobile number already exists' },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.create({
      data: {
        patientName,
        patientMobile
      }
    });

    return NextResponse.json({ success: true, patient });
  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function listPatients(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const mobile = searchParams.get('mobile');
    const search = searchParams.get('search');

    if (mobile) {
      const patient = await prisma.patient.findUnique({ where: { patientMobile: mobile } });
      return NextResponse.json({ patient });
    }

    if (search) {
      const patients = await prisma.patient.findMany({
        where: {
          OR: [
            {
              patientName: {
                contains: search,
                mode: 'insensitive'
              }
            },
            {
              patientMobile: {
                contains: search
              }
            }
          ]
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      return NextResponse.json({ patients });
    }

    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function updatePatient(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session || !session.user?.permissions?.MANAGE_PATIENT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, patientName, patientMobile } = body;

    if (!id) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    if (!patientName || !patientMobile) {
      return NextResponse.json(
        { error: 'Patient name and mobile are required' },
        { status: 400 }
      );
    }

    const existingPatient = await prisma.patient.findUnique({ where: { id } });

    if (!existingPatient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const duplicatePatient = await prisma.patient.findFirst({
      where: {
        patientMobile,
        id: { not: id }
      }
    });

    if (duplicatePatient) {
      return NextResponse.json(
        { error: 'Another patient with this mobile number already exists' },
        { status: 400 }
      );
    }

    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: {
        patientName,
        patientMobile
      }
    });

    return NextResponse.json({ success: true, patient: updatedPatient });
  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
