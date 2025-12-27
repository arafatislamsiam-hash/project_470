import { prisma } from '@/lib/db';

export function findPatientByMobile(patientMobile: string) {
  return prisma.patient.findUnique({
    where: { patientMobile },
  });
}

export function findPatientById(id: string) {
  return prisma.patient.findUnique({
    where: { id },
  });
}

export function searchPatients(term: string) {
  return prisma.patient.findMany({
    where: {
      OR: [
        {
          patientName: {
            contains: term,
            mode: 'insensitive',
          },
        },
        {
          patientMobile: {
            contains: term,
          },
        },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
}

export function listPatients() {
  return prisma.patient.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export function createPatient(data: { patientName: string; patientMobile: string }) {
  return prisma.patient.create({
    data,
  });
}

export function updatePatient(id: string, data: { patientName: string; patientMobile: string }) {
  return prisma.patient.update({
    where: { id },
    data,
  });
}

export function deletePatient(id: string) {
  return prisma.patient.delete({
    where: { id },
  });
}

export function countInvoicesForPatient(patientId: string) {
  return prisma.invoice.count({
    where: { patientId },
  });
}
