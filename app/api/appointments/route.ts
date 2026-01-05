import { NextRequest } from 'next/server';
import { createAppointment, listAppointments } from '@/server/controllers/appointmentController';

export async function GET(request: NextRequest) {
  return listAppointments(request);
}

export async function POST(request: NextRequest) {
  return createAppointment(request);
}
