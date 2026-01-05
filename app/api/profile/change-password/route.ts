import { NextRequest } from 'next/server';
import { changePassword } from '@/server/controllers/profileController';

export async function POST(request: NextRequest) {
  return changePassword(request);
}
