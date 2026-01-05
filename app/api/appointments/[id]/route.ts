import { NextRequest } from 'next/server';
import {
  deleteAppointment,
  getAppointment,
  updateAppointment
} from '@/server/controllers/appointmentController';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, ctx: RouteParams) {
  return getAppointment(request, ctx);
}

export async function PUT(request: NextRequest, ctx: RouteParams) {
  return updateAppointment(request, ctx);
}

export async function DELETE(request: NextRequest, ctx: RouteParams) {
  return deleteAppointment(request, ctx);
}
