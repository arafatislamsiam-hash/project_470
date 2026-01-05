import { prisma } from '@/server/models';
import { getSessionWithPermissions } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function listCategories() {
  try {
    const session = await getSessionWithPermissions();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const categories = await prisma.category.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { title: 'asc' }
      ],
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    return NextResponse.json({ categories });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function createCategory(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session || !session.user.permissions.MANAGE_CATEGORIES) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const existingCategory = await prisma.category.findUnique({
      where: { title }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this title already exists' },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        title,
        description: description || null,
        isDefault: false
      }
    });

    return NextResponse.json({
      success: true,
      category
    });

  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
