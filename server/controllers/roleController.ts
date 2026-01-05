import { prisma } from '@/server/models';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function listRoles() {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function createRole(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, permissions } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const existingRole = await prisma.role.findUnique({ where: { name } });

    if (existingRole) {
      return NextResponse.json({ error: 'Role with this name already exists' }, { status: 409 });
    }

    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions: permissions ? JSON.stringify(permissions) : ''
      }
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function updateRole(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, permissions } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'ID and name are required' }, { status: 400 });
    }

    const existingRole = await prisma.role.findUnique({ where: { id } });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const roleWithSameName = await prisma.role.findFirst({
      where: {
        name,
        id: { not: id }
      }
    });

    if (roleWithSameName) {
      return NextResponse.json({ error: 'Role with this name already exists' }, { status: 409 });
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        name,
        description,
        permissions: permissions ? JSON.stringify(permissions) : ''
      }
    });

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function deleteRole(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 });
    }

    const existingRole = await prisma.role.findUnique({ where: { id } });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const usersWithRole = await prisma.user.findMany({
      where: { roles: { some: { id } } }
    });

    if (usersWithRole.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role that is assigned to users' },
        { status: 409 }
      );
    }

    await prisma.role.delete({ where: { id } });

    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
