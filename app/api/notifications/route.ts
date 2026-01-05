import { NextRequest } from 'next/server';
import { listNotifications, markNotificationsRead } from '@/server/controllers/notificationController';

export async function GET(request: NextRequest) {
  return listNotifications(request);
}

export async function PATCH(request: NextRequest) {
  return markNotificationsRead(request);
}
