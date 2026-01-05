import { prisma } from '@/lib/db';
import { getSessionWithPermissions } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = Math.max(
      1,
      Math.min(25, parseInt(request.nextUrl.searchParams.get('limit') || '10', 10))
    );

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false }
      })
    ]);

    return NextResponse.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === 'string') : [];
    const markAll = Boolean(body?.markAll);

    if (!markAll && ids.length === 0) {
      return NextResponse.json({ error: 'No notifications selected' }, { status: 400 });
    }

    const whereClause = markAll
      ? { userId: session.user.id, isRead: false }
      : { userId: session.user.id, id: { in: ids } };

    const result = await prisma.notification.updateMany({
      where: whereClause,
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, isRead: false }
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
      unreadCount
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
