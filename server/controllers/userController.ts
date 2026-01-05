import { hashPassword } from '@/lib/auth';
import { prisma } from '@/server/models';
import { notifyUserAssignment } from '@/lib/notifications';
import { getSessionWithPermissions } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function listUsers() {
  try {
    const session = await getSessionWithPermissions();

    if (!session || !session.user.permissions.CREATE_USER) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
                description: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function createUser(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session || !session.user.permissions.CREATE_USER) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, roleId } = body;

    if (!name || !email || !password || !roleId) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        createdBy: session.user.id,
        roles: {
          create: {
            roleId
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
                description: true
              }
            }
          }
        }
      }
    });

    await notifyUserAssignment({
      userId: user.id,
      roleName: role.name,
      assignedById: session.user.id,
      assignedByName: session.user.name
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
