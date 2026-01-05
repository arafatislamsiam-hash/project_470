import { NextRequest } from 'next/server';
import { createUser, listUsers } from '@/server/controllers/userController';

export async function GET() {
  return listUsers();
}

export async function POST(request: NextRequest) {
  return createUser(request);
}
