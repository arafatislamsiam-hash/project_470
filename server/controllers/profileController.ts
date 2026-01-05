import { hashPassword, verifyPassword } from '@/lib/auth';
import { prisma } from '@/server/models';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function changePassword(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Both current and new passwords are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session?.user?.email || undefined }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { email: session?.user?.email || undefined },
      data: { password: hashedNewPassword }
    });

    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
