import { prisma } from '@/lib/db';
import { getSessionWithPermissions } from '@/lib/session';
import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const VALID_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'];

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session) {
      return unauthorizedResponse();
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const patientId = searchParams.get('patientId');
    const upcoming = searchParams.get('upcoming') === 'true';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status filter' },
        { status: 400 }
      );
    }

    const where: Prisma.AppointmentWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (upcoming) {
      const now = new Date();
      where.appointmentDate = {
        gte: now
      };
      if (!status) {
        where.status = 'scheduled';
      }
    } else if (from || to) {
      where.appointmentDate = {};
      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid from date' },
            { status: 400 }
          );
        }
        where.appointmentDate.gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid to date' },
            { status: 400 }
          );
        }
        where.appointmentDate.lte = toDate;
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            patientName: true,
            patientMobile: true
          }
        },
        invoice: {
          select: {
            id: true,
            invoiceNo: true,
            totalAmount: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        appointmentDate: 'asc'
      }
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (
      !session ||
      !(session.user.permissions.MANAGE_PATIENT || session.user.permissions.CREATE_INVOICE)
    ) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const {
      patientId,
      appointmentDate,
      reason,
      notes,
      branch,
      status = 'scheduled'
    } = body;

    if (!patientId || !appointmentDate) {
      return NextResponse.json(
        { error: 'Patient and appointment date are required' },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid appointment status' },
        { status: 400 }
      );
    }

    const parsedDate = new Date(appointmentDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid appointment date' },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        appointmentDate: parsedDate,
        status,
        reason: reason || null,
        notes: notes || null,
        branch: branch || null
      },
      include: {
        patient: {
          select: {
            id: true,
            patientName: true,
            patientMobile: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
