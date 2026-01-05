import { prisma } from '@/lib/db';
import { generateInvoiceNumber } from '@/lib/invoice-utils';
import { determineInvoiceStatus, notifyInvoiceStatusChange } from '@/lib/notifications';
import { getSessionWithPermissions } from '@/lib/session';
import { NextRequest, NextResponse } from 'next/server';

type InvoiceLinePayload = {
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: string;
  discountAmount: number;
  total: number;
  isManual: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session || !session.user?.permissions?.CREATE_INVOICE) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { items, discount = 0, discountType = 'percentage', patientId, branch, paidAmount = 0, corporateId, appointmentId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invoice items are required' },
        { status: 400 }
      );
    }

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    let appointmentToLink: {
      id: string;
      status: string;
      patientId: string;
    } | null = null;

    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          invoice: {
            select: {
              id: true
            }
          }
        }
      });

      if (!appointment) {
        return NextResponse.json(
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }

      if (appointment.patientId !== patientId) {
        return NextResponse.json(
          { error: 'Appointment does not belong to the selected patient' },
          { status: 400 }
        );
      }

      if (appointment.status !== 'scheduled') {
        return NextResponse.json(
          { error: 'Only scheduled appointments can be linked to invoices' },
          { status: 400 }
        );
      }

      if (appointment.invoice) {
        return NextResponse.json(
          { error: 'This appointment is already linked to an invoice' },
          { status: 400 }
        );
      }

      appointmentToLink = appointment;
    }

    // Generate invoice number safely
    const invoiceNo = await generateInvoiceNumber();

    // Process invoice items
    const invoiceItems: InvoiceLinePayload[] = [];
    let calculatedSubtotal = 0;
    let totalItemDiscounts = 0;

    const productUsage: Record<string, number> = {};

    for (const item of items) {
      let productId = null;
      let unitPrice = 0;
      let productName = '';
      const quantity = parseInt(item.quantity);

      if (Number.isNaN(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: `Quantity must be greater than zero for ${item.productName || 'the selected item'}` },
          { status: 400 }
        );
      }

      if (item.productId && !item.isManual) {
        // Existing product
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          return NextResponse.json(
            { error: `Product not found: ${item.productId}` },
            { status: 400 }
          );
        }

        const currentUsage = productUsage[product.id] || 0;

        if (currentUsage + quantity > product.stockQuantity) {
          return NextResponse.json(
            { error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity - currentUsage}` },
            { status: 400 }
          );
        }

        productUsage[product.id] = currentUsage + quantity;
        productId = product.id;
        unitPrice = parseFloat(product.price.toString());
        productName = product.name;
      } else {
        // Manual entry
        unitPrice = parseFloat(item.unitPrice.toString());
        productName = item.productName;
      }

      const itemSubtotal = quantity * unitPrice;
      const itemDiscount = parseFloat(item.discount || 0);
      const itemDiscountType = item.discountType || 'percentage';

      let itemDiscountAmount = 0;
      if (itemDiscount > 0) {
        if (itemDiscountType === 'percentage') {
          itemDiscountAmount = (itemSubtotal * itemDiscount) / 100;
        } else {
          itemDiscountAmount = Math.min(itemDiscount, itemSubtotal);
        }
      }

      const total = itemSubtotal - itemDiscountAmount;
      calculatedSubtotal += itemSubtotal;
      totalItemDiscounts += itemDiscountAmount;

      invoiceItems.push({
        productId,
        productName,
        quantity,
        unitPrice,
        discount: itemDiscount,
        discountType: itemDiscountType,
        discountAmount: itemDiscountAmount,
        total,
        isManual: item.isManual || false
      });
    }

    // Calculate additional discount amount (applied after item discounts)
    const subtotalAfterItemDiscounts = calculatedSubtotal - totalItemDiscounts;
    let calculatedDiscountAmount = 0;
    if (discount > 0) {
      if (discountType === 'percentage') {
        calculatedDiscountAmount = (subtotalAfterItemDiscounts * discount) / 100;
      } else {
        calculatedDiscountAmount = Math.min(discount, subtotalAfterItemDiscounts);
      }
    }

    const finalTotal = Math.max(0, calculatedSubtotal - totalItemDiscounts - calculatedDiscountAmount);
    const invoiceStatus = determineInvoiceStatus(finalTotal, parseFloat(paidAmount.toString()));

    // Create invoice with items and update inventory atomically
    const invoice = await prisma.$transaction(async (tx) => {
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNo,
          branch,
          corporateId,
          patientId,
          subtotal: calculatedSubtotal,
          discount,
          discountType,
          discountAmount: calculatedDiscountAmount,
          totalAmount: finalTotal,
          status: invoiceStatus,
          paidAmount: parseFloat(paidAmount.toString()),
          createdBy: session.user.id,
          appointmentId: appointmentToLink?.id,
          items: {
            create: invoiceItems
          }
        },
        include: {
          patient: true,
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          },
          appointment: {
            select: {
              id: true,
              appointmentDate: true,
              status: true,
              reason: true,
              branch: true
            }
          },
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      await Promise.all(
        Object.entries(productUsage).map(([productId, quantityUsed]) =>
          tx.product.update({
            where: { id: productId },
            data: {
              stockQuantity: {
                decrement: quantityUsed
              }
            }
          })
        )
      );

      if (appointmentToLink) {
        await tx.appointment.update({
          where: { id: appointmentToLink.id },
          data: {
            status: 'completed'
          }
        });
      }

      return createdInvoice;
    });

    return NextResponse.json({
      success: true,
      invoice
    });

  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const invoices = await prisma.invoice.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: true,
        appointment: {
          select: {
            id: true,
            appointmentDate: true,
            status: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true
              }
            }
          }
        }
      },
      // If user doesn't have VIEW_ALL_INVOICES permission, only show their invoices
      where: session.user.permissions.VIEW_ALL_INVOICES ? {} : {
        createdBy: session.user.id
      }
    });

    const totalInvoices = await prisma.invoice.count({
      where: session.user.permissions.VIEW_ALL_INVOICES ? {} : {
        createdBy: session.user.id
      }
    });

    return NextResponse.json({
      invoices,
      totalInvoices,
      totalPages: Math.ceil(totalInvoices / limit),
      currentPage: page
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!session || !session.user?.permissions?.CREATE_INVOICE) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, items, discount = 0, discountType = 'percentage', patientId, branch, paidAmount = 0, corporateId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invoice items are required' },
        { status: 400 }
      );
    }

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Check if invoice exists and user has permission to update it
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if user can update this invoice (either created by them or has VIEW_ALL_INVOICES permission)
    if (!session.user.permissions.VIEW_ALL_INVOICES && existingInvoice.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to update this invoice' },
        { status: 403 }
      );
    }

    const previousUsage: Record<string, number> = {};
    existingInvoice.items.forEach((item) => {
      if (item.productId) {
        previousUsage[item.productId] = (previousUsage[item.productId] || 0) + item.quantity;
      }
    });

    // Process invoice items
    const invoiceItems: InvoiceLinePayload[] = [];
    let calculatedSubtotal = 0;
    let totalItemDiscounts = 0;
    const productUsage: Record<string, number> = {};

    for (const item of items) {
      let productId = null;
      let unitPrice = 0;
      let productName = '';
      const quantity = parseInt(item.quantity);

      if (Number.isNaN(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: `Quantity must be greater than zero for ${item.productName || 'the selected item'}` },
          { status: 400 }
        );
      }

      if (item.productId && !item.isManual) {
        // Existing product
        const product = await prisma.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          return NextResponse.json(
            { error: `Product not found: ${item.productId}` },
            { status: 400 }
          );
        }

        const currentUsage = productUsage[product.id] || 0;
        const previouslyAllocated = previousUsage[product.id] || 0;
        const availableStock = product.stockQuantity + previouslyAllocated;

        if (currentUsage + quantity > availableStock) {
          return NextResponse.json(
            { error: `Insufficient stock for ${product.name}. Available: ${availableStock - currentUsage}` },
            { status: 400 }
          );
        }

        productUsage[product.id] = currentUsage + quantity;
        productId = product.id;
        unitPrice = parseFloat(product.price.toString());
        productName = product.name;
      } else {
        // Manual entry
        unitPrice = parseFloat(item.unitPrice.toString());
        productName = item.productName;
      }

      const itemSubtotal = quantity * unitPrice;
      const itemDiscount = parseFloat(item.discount || 0);
      const itemDiscountType = item.discountType || 'percentage';

      let itemDiscountAmount = 0;
      if (itemDiscount > 0) {
        if (itemDiscountType === 'percentage') {
          itemDiscountAmount = (itemSubtotal * itemDiscount) / 100;
        } else {
          itemDiscountAmount = Math.min(itemDiscount, itemSubtotal);
        }
      }

      const total = itemSubtotal - itemDiscountAmount;
      calculatedSubtotal += itemSubtotal;
      totalItemDiscounts += itemDiscountAmount;

      invoiceItems.push({
        productId,
        productName,
        quantity,
        unitPrice,
        discount: itemDiscount,
        discountType: itemDiscountType,
        discountAmount: itemDiscountAmount,
        total,
        isManual: item.isManual || false
      });
    }

    // Calculate additional discount amount (applied after item discounts)
    const subtotalAfterItemDiscounts = calculatedSubtotal - totalItemDiscounts;
    let calculatedDiscountAmount = 0;
    if (discount > 0) {
      if (discountType === 'percentage') {
        calculatedDiscountAmount = (subtotalAfterItemDiscounts * discount) / 100;
      } else {
        calculatedDiscountAmount = Math.min(discount, subtotalAfterItemDiscounts);
      }
    }

    const finalTotal = Math.max(0, calculatedSubtotal - totalItemDiscounts - calculatedDiscountAmount);
    const updatedStatus = determineInvoiceStatus(finalTotal, parseFloat(paidAmount.toString()));

    const inventoryAdjustments: Record<string, number> = {};
    const allProductIds = new Set([...Object.keys(previousUsage), ...Object.keys(productUsage)]);
    allProductIds.forEach((productId) => {
      const prevQty = previousUsage[productId] || 0;
      const newQty = productUsage[productId] || 0;
      inventoryAdjustments[productId] = newQty - prevQty;
    });

    const updatedInvoice = await prisma.$transaction(async (tx) => {
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id }
      });

      const invoiceRecord = await tx.invoice.update({
        where: { id },
        data: {
          patientId,
          branch,
          corporateId,
          subtotal: calculatedSubtotal,
          discount,
          discountType,
          discountAmount: calculatedDiscountAmount,
          totalAmount: finalTotal,
          status: updatedStatus,
          paidAmount: parseFloat(paidAmount.toString()),
          updatedAt: new Date(),
          items: {
            create: invoiceItems
          }
        },
        include: {
          patient: true,
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          },
          appointment: {
            select: {
              id: true,
              appointmentDate: true,
              status: true,
              reason: true,
              branch: true
            }
          },
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      await Promise.all(
        Object.entries(inventoryAdjustments)
          .filter(([, delta]) => delta !== 0)
          .map(([productId, delta]) =>
            tx.product.update({
              where: { id: productId },
              data: delta > 0
                ? { stockQuantity: { decrement: delta } }
                : { stockQuantity: { increment: Math.abs(delta) } }
            })
          )
      );

      return invoiceRecord;
    });

    if (existingInvoice.status !== updatedStatus) {
      await notifyInvoiceStatusChange({
        invoiceId: updatedInvoice.id,
        invoiceNo: updatedInvoice.invoiceNo,
        newStatus: updatedStatus,
        actorId: session.user.id,
        actorName: session.user.name,
        recipientId: existingInvoice.createdBy
      });
    }

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice
    });

  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {

  const session = await getSessionWithPermissions();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const body = await request.json();

  const { id } = body;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        appointment: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const restockMap: Record<string, number> = {};
    invoice.items.forEach((item) => {
      if (item.productId) {
        restockMap[item.productId] = (restockMap[item.productId] || 0) + item.quantity;
      }
    });

    await prisma.$transaction(async (tx) => {
      if (invoice.appointment) {
        await tx.appointment.update({
          where: { id: invoice.appointment.id },
          data: {
            status: 'scheduled'
          }
        });
      }

      await Promise.all(
        Object.entries(restockMap).map(([productId, qty]) =>
          tx.product.update({
            where: { id: productId },
            data: {
              stockQuantity: {
                increment: qty
              }
            }
          })
        )
      );

      // Delete invoice items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id }
      });

      // Delete invoice
      await tx.invoice.delete({
        where: { id }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
