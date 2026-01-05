import { prisma } from '@/server/models';
import { getSessionWithPermissions } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

interface ProductRouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function listProducts(request: NextRequest) {
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

export async function createProduct(request: NextRequest) {
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

export async function getProduct(request: NextRequest, ctx: ProductRouteParams) {
  try {
    const session = await getSessionWithPermissions();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });

  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function updateProduct(request: NextRequest, ctx: ProductRouteParams) {
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

    const { id } = await ctx.params;

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 400 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
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
      product: updatedProduct
    });

  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function deleteProduct(request: NextRequest, ctx: ProductRouteParams) {
  try {
    const session = await getSessionWithPermissions();

    if (!session || !session.user.permissions.MANAGE_PRODUCTS) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await ctx.params;

    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const invoiceCount = await prisma.invoiceItem.count({
      where: { productId: id }
    });

    if (invoiceCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product that is used in invoices' },
        { status: 400 }
      );
    }

    await prisma.product.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
