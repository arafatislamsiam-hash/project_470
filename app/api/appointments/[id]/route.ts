import { prisma } from '@/lib/db';
import { getSessionWithPermissions } from '@/lib/session';
import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const VALID_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'];

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionWithPermissions();

    if (!session) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
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
            totalAmount: true
          }
        }
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ appointment });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionWithPermissions();

    if (
      !session ||
      !(session.user.permissions.MANAGE_PATIENT || session.user.permissions.CREATE_INVOICE)
    ) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        invoice: true
      }
    });

    if (!existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { appointmentDate, status, reason, notes, branch } = body;
    const data: Prisma.AppointmentUpdateInput = {};

    if (appointmentDate) {
      const parsedDate = new Date(appointmentDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid appointment date' },
          { status: 400 }
        );
      }
      data.appointmentDate = parsedDate;
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid appointment status' },
          { status: 400 }
        );
      }

      if (existingAppointment.invoice && status !== 'completed') {
        return NextResponse.json(
          { error: 'Linked appointments that have invoices can only be marked as completed' },
          { status: 400 }
        );
      }

      data.status = status;
    }

    if (reason !== undefined) {
      data.reason = reason || null;
    }

    if (notes !== undefined) {
      data.notes = notes || null;
    }

    if (branch !== undefined) {
      data.branch = branch || null;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data,
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
            totalAmount: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionWithPermissions();

    if (
      !session ||
      !(session.user.permissions.MANAGE_PATIENT || session.user.permissions.CREATE_INVOICE)
    ) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        invoice: true
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    if (appointment.invoice) {
      return NextResponse.json(
        { error: 'Cannot delete an appointment that is linked to an invoice' },
        { status: 400 }
      );
    }

    await prisma.appointment.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
