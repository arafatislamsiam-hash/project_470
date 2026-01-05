import { NextRequest } from 'next/server';
import { createPatient, listPatients, updatePatient } from '@/server/controllers/patientController';

export async function POST(request: NextRequest) {
  return createPatient(request);
}

export async function GET(request: NextRequest) {
  return listPatients(request);
}

export async function PUT(request: NextRequest) {
  return updatePatient(request);
}
