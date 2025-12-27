import {
  countInvoicesForPatient,
  createPatient,
  deletePatient,
  findPatientById,
  findPatientByMobile,
  listPatients,
  searchPatients,
  updatePatient,
} from '@/server/repositories/patientRepository';
import { ServiceError } from '@/server/services/serviceErrors';
import { SessionUser } from '@/server/services/types';

type PatientPayload = {
  id?: string;
  patientName: string;
  patientMobile: string;
};

function ensureUser(user?: SessionUser): asserts user is SessionUser {
  if (!user?.id) {
    throw new ServiceError('Unauthorized', 401);
  }
}

function ensureCanManagePatients(user: SessionUser) {
  if (!user.permissions?.MANAGE_PATIENT) {
    throw new ServiceError('Unauthorized', 401);
  }
}

export async function createPatientForUser(payload: PatientPayload, user?: SessionUser) {
  ensureUser(user);
  ensureCanManagePatients(user);

  if (!payload.patientName || !payload.patientMobile) {
    throw new ServiceError('Patient name and mobile are required', 400);
  }

  const existingPatient = await findPatientByMobile(payload.patientMobile);
  if (existingPatient) {
    throw new ServiceError('Patient with this mobile number already exists', 400);
  }

  const patient = await createPatient({
    patientName: payload.patientName,
    patientMobile: payload.patientMobile,
  });

  return { patient };
}

export async function getPatients(
  params: { mobile?: string | null; search?: string | null },
  user?: SessionUser
) {
  ensureUser(user);

  if (params.mobile) {
    const patient = await findPatientByMobile(params.mobile);
    return { patient };
  }

  if (params.search) {
    const patients = await searchPatients(params.search);
    return { patients };
  }

  const patients = await listPatients();
  return { patients };
}

export async function updatePatientForUser(payload: PatientPayload, user?: SessionUser) {
  ensureUser(user);
  ensureCanManagePatients(user);

  if (!payload.id) {
    throw new ServiceError('Patient ID is required', 400);
  }

  if (!payload.patientName || !payload.patientMobile) {
    throw new ServiceError('Patient name and mobile are required', 400);
  }

  const existingPatient = await findPatientById(payload.id);
  if (!existingPatient) {
    throw new ServiceError('Patient not found', 404);
  }

  const duplicatePatient = await findPatientByMobile(payload.patientMobile);
  if (duplicatePatient && duplicatePatient.id !== payload.id) {
    throw new ServiceError('Another patient with this mobile number already exists', 400);
  }

  const patient = await updatePatient(payload.id, {
    patientName: payload.patientName,
    patientMobile: payload.patientMobile,
  });

  return { patient };
}

export async function deletePatientForUser(id: string, user?: SessionUser) {
  ensureUser(user);
  ensureCanManagePatients(user);

  if (!id) {
    throw new ServiceError('Patient ID is required', 400);
  }

  const existingPatient = await findPatientById(id);
  if (!existingPatient) {
    throw new ServiceError('Patient not found', 404);
  }

  const invoiceCount = await countInvoicesForPatient(id);
  if (invoiceCount > 0) {
    throw new ServiceError('Cannot delete patient with existing invoices', 400);
  }

  await deletePatient(id);
}
