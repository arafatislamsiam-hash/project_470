import { prisma } from '@/lib/db';
import { getSessionWithPermissions } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');

    const where = categoryId ? { categoryId } : {};

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ products });

  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session || !session.user.permissions.MANAGE_PRODUCTS) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, price, description, categoryId, stockQuantity = 0, lowStockThreshold = 0 } = body;

    if (!name || !price) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }

    const parsedStock = Math.floor(Number(stockQuantity) || 0);
    const parsedThreshold = Math.floor(Number(lowStockThreshold) || 0);

    if (parsedStock < 0 || parsedThreshold < 0 || Number.isNaN(parsedStock) || Number.isNaN(parsedThreshold)) {
      return NextResponse.json(
        { error: 'Stock quantity and low stock threshold must be valid non-negative numbers' },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        price: parseFloat(price),
        description: description || null,
        categoryId,
        stockQuantity: parsedStock,
        lowStockThreshold: parsedThreshold
      },
      include: {
        category: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      product
    });

  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
