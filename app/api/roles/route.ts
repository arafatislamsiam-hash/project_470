import { NextRequest } from 'next/server';
import { createRole, deleteRole, listRoles, updateRole } from '@/server/controllers/roleController';

export async function GET() {
  return listRoles();
}

export async function POST(request: NextRequest) {
  return createRole(request);
}

export async function PUT(request: NextRequest) {
  return updateRole(request);
}

export async function DELETE(request: NextRequest) {
  return deleteRole(request);
}
