import { prisma } from '@/server/models';
import { getSessionWithPermissions } from '@/lib/session';
import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const VALID_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'] as const;

type AppointmentStatus = typeof VALID_STATUSES[number];

const unauthorizedResponse = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

interface AppointmentRouteParams {
  params: Promise<{ id: string }>;
}

export async function listAppointments(request: NextRequest) {
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

    if (status && !VALID_STATUSES.includes(status as AppointmentStatus)) {
      return NextResponse.json(
        { error: 'Invalid status filter' },
        { status: 400 }
      );
    }

    const where: Prisma.AppointmentWhereInput = {};

    if (status) {
      where.status = status as AppointmentStatus;
    }

    if (patientId) {
      where.patientId = patientId;
    }

    if (upcoming) {
      const now = new Date();
      where.appointmentDate = { gte: now };
      if (!status) {
        where.status = 'scheduled';
      }
    } else if (from || to) {
      where.appointmentDate = {};
      if (from) {
        const fromDate = new Date(from);
        if (Number.isNaN(fromDate.getTime())) {
          return NextResponse.json(
            { error: 'Invalid from date' },
            { status: 400 }
          );
        }
        where.appointmentDate.gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (Number.isNaN(toDate.getTime())) {
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
      orderBy: { appointmentDate: 'asc' }
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

export async function createAppointment(request: NextRequest) {
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

    if (!VALID_STATUSES.includes(status as AppointmentStatus)) {
      return NextResponse.json(
        { error: 'Invalid appointment status' },
        { status: 400 }
      );
    }

    const parsedDate = new Date(appointmentDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid appointment date' },
        { status: 400 }
      );
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });

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

export async function getAppointment(request: NextRequest, ctx: AppointmentRouteParams) {
  try {
    const session = await getSessionWithPermissions();

    if (!session) {
      return unauthorizedResponse();
    }

    const { id } = await ctx.params;

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

export async function updateAppointment(request: NextRequest, ctx: AppointmentRouteParams) {
  try {
    const session = await getSessionWithPermissions();

    if (
      !session ||
      !(session.user.permissions.MANAGE_PATIENT || session.user.permissions.CREATE_INVOICE)
    ) {
      return unauthorizedResponse();
    }

    const { id } = await ctx.params;
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: { invoice: true }
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
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid appointment date' },
          { status: 400 }
        );
      }
      data.appointmentDate = parsedDate;
    }

    if (status) {
      if (!VALID_STATUSES.includes(status as AppointmentStatus)) {
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

export async function deleteAppointment(request: NextRequest, ctx: AppointmentRouteParams) {
  try {
    const session = await getSessionWithPermissions();

    if (
      !session ||
      !(session.user.permissions.MANAGE_PATIENT || session.user.permissions.CREATE_INVOICE)
    ) {
      return unauthorizedResponse();
    }

    const { id } = await ctx.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { invoice: true }
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

    await prisma.appointment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
