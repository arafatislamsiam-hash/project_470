"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PATCH = PATCH;
const db_1 = require("@/lib/db");
const session_1 = require("@/lib/session");
const server_1 = require("next/server");
async function GET(request) {
    try {
        const session = await (0, session_1.getSessionWithPermissions)();
        if (!session) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const limit = Math.max(1, Math.min(25, parseInt(request.nextUrl.searchParams.get('limit') || '10', 10)));
        const [notifications, unreadCount] = await Promise.all([
            db_1.prisma.notification.findMany({
                where: { userId: session.user.id },
                orderBy: { createdAt: 'desc' },
                take: limit
            }),
            db_1.prisma.notification.count({
                where: { userId: session.user.id, isRead: false }
            })
        ]);
        return server_1.NextResponse.json({
            notifications,
            unreadCount
        });
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function PATCH(request) {
    try {
        const session = await (0, session_1.getSessionWithPermissions)();
        if (!session) {
            return server_1.NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json().catch(() => null);
        const ids = Array.isArray(body === null || body === void 0 ? void 0 : body.ids) ? body.ids.filter((id) => typeof id === 'string') : [];
        const markAll = Boolean(body === null || body === void 0 ? void 0 : body.markAll);
        if (!markAll && ids.length === 0) {
            return server_1.NextResponse.json({ error: 'No notifications selected' }, { status: 400 });
        }
        const whereClause = markAll
            ? { userId: session.user.id, isRead: false }
            : { userId: session.user.id, id: { in: ids } };
        const result = await db_1.prisma.notification.updateMany({
            where: whereClause,
            data: {
                isRead: true,
                readAt: new Date()
            }
        });
        const unreadCount = await db_1.prisma.notification.count({
            where: { userId: session.user.id, isRead: false }
        });
        return server_1.NextResponse.json({
            success: true,
            updated: result.count,
            unreadCount
        });
    }
    catch (error) {
        console.error('Error updating notifications:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
