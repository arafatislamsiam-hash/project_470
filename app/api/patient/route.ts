import { prisma } from '@/lib/db';
import { getSessionWithPermissions } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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

    // Check if patient with this mobile already exists
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

    return NextResponse.json({
      success: true,
      patient
    });

  } catch (error) {
    console.error('Error creating patient:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
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

    if (mobile) {
      // Get patient by mobile number
      const patient = await prisma.patient.findUnique({
        where: { patientMobile: mobile }
      });

      return NextResponse.json({
        patient
      });
    } else if (search) {
      // Search patients by name or mobile
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
        take: 10 // Limit search results
      });

      return NextResponse.json({
        patients
      });
    } else {
      // Get all patients
      const patients = await prisma.patient.findMany({
        orderBy: { createdAt: 'desc' }
      });

      return NextResponse.json({
        patients
      });
    }

  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session || !session.user?.permissions?.MANAGE_PATIENT) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, patientName, patientMobile } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    if (!patientName || !patientMobile) {
      return NextResponse.json(
        { error: 'Patient name and mobile are required' },
        { status: 400 }
      );
    }

    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id }
    });

    if (!existingPatient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Check if another patient with this mobile exists (excluding current patient)
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

    return NextResponse.json({
      success: true,
      patient: updatedPatient
    });

  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session || !session.user?.permissions?.MANAGE_PATIENT) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id },
      include: {
        invoices: true
      }
    });

    if (!existingPatient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Check if patient has invoices
    if (existingPatient.invoices.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete patient with existing invoices' },
        { status: 400 }
      );
    }

    await prisma.patient.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Patient deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting patient:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
