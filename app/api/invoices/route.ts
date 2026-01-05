import { NextRequest } from 'next/server';
import {
  createInvoice,
  deleteInvoice,
  getInvoices,
  updateInvoice
} from '@/server/controllers/invoiceController';

export async function POST(request: NextRequest) {
  return createInvoice(request);
}

export async function GET(request: NextRequest) {
  return getInvoices(request);
}

export async function PUT(request: NextRequest) {
  return updateInvoice(request);
}

export async function DELETE(request: NextRequest) {
  return deleteInvoice(request);
}
