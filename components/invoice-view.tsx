'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface InvoiceViewProps {
  invoice: {
    id: string;
    invoiceNo: string;
    status: string;
    patientId: number;
    patientName: string;
    patientMobile: string;
    branch: string;
    corporateId: string;
    subtotal: number;
    discount: number;
    discountType: string;
    discountAmount: number;
    totalAmount: number;
    paidAmount: number;
    creditAppliedAmount: number;
    refundedAmount: number;
    createdAt: Date;
    appointment?: {
      id: string;
      appointmentDate: string;
      status: string;
      reason?: string | null;
      branch?: string | null;
    } | null;
    user: {
      name: string;
      email: string;
    };
    items: Array<{
      id: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      discountType: string;
      discountAmount: number;
      total: number;
      isManual: boolean;
      product?: {
        name: string;
        category: {
          title: string;
        };
      } | null;
    }>;
    appliedCredits?: {
      id: string;
      creditNoteId: string;
      creditNo: string;
      amount: number;
    }[];
    creditNotes?: {
      id: string;
      creditNo: string;
      type: string;
      status: string;
      reason?: string | null;
      notes?: string | null;
      totalAmount: number;
      remainingAmount: number;
      createdAt: string;
      applications: Array<{
        id: string;
        appliedInvoiceId: string;
        appliedInvoiceNo: string;
        appliedAmount: number;
      }>;
    }[];
  };
}

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  unpaid: 'bg-gray-100 text-gray-700',
  refunded: 'bg-red-100 text-red-700'
};

export default function InvoiceView({ invoice }: InvoiceViewProps) {
  const router = useRouter();
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundError, setRefundError] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const appointmentInfo = invoice.appointment
    ? {
      ...invoice.appointment,
      formattedDate: new Date(invoice.appointment.appointmentDate).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    }
    : null;
  const appliedCreditList = invoice.appliedCredits ?? [];
  const creditNotes = invoice.creditNotes ?? [];
  const statusBadge = STATUS_STYLES[invoice.status] ?? STATUS_STYLES.unpaid;
  const refundableRemaining = Math.max(0, invoice.totalAmount - invoice.refundedAmount);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const element = document.getElementById('invoice-content');
    if (!element) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNo}</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              background: white;
              color: #000;
            }

            .invoice-container {
              padding-top: 32px;
              background: white;
              height: 97.1%;
              position: relative;
            }

            .header-section {
              margin-bottom: 24px;
              padding-left: 32px;
              padding-right: 32px;
            }

            .header-content {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 24px;
            }

            .logo-section {
              display: flex;
              align-items: center;
              width: 128px;
              height: 128px;
              margin-right: 24px;
              flex-direction: column;
            }

            .logo-container {
              width: auto;
              height: 200px;
            }

            .branch-info {
              text-align: center;
              margin-top: 8px;
            }

            .branch-text {
              font-size: 14px;
              font-weight: 500;
              color: #2B2369;
            }

            .right-section {
              text-align: right;
            }

            .invoice-number {
              margin-bottom: 8px;
            }

            .date-section {
              margin-bottom: 0;
            }

            .date-label {
              font-size: 14px;
              font-weight: 500;
              color: #2B2369;
            }

            .date-value {
              border-bottom: 1px dotted #4b5563;
              padding-bottom: 1px;
              display: inline-block;
            }

            .divider {
              border: none;
              border-top: 2px solid #000;
              margin: 32px 0;
            }

            .patient-section {
              padding-left: 32px;
              padding-right: 32px;
              margin-bottom: 32px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
              font-weight: 600;
            }

            .patient-row {
              display: flex;
              align-items: center;
            }

            .patient-label {
              font-size: 14px;
              font-weight: 600;
              margin-right: 8px;
            }

            .patient-value {
              border-bottom: 1px dotted #4b5563;
              padding-bottom: 1px;
              flex: 1;
              display: inline-block;
            }

            .table-section {
              padding-left: 32px;
              padding-right: 32px;
            }

            .main-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 0;
            }

            .table-header {
              background-color: transparent;
            }

            .header-cell {
              padding: 16px;
              text-align: center;
              font-weight: bold;
              font-size: 14px;
              color: #000;
            }

            .table-body {
              background-color: transparent;
            }

            .body-cell {
              padding: 8px 16px;
              text-align: left;
              vertical-align: top;
              font-size: 14px;
              min-height: 60px;
              border-bottom: 1px solid #000;
            }

            .white-border {
              border-bottom: 1px solid #fff;
            }

            .body-cell.center {
              text-align: center;
            }

            .totals-table {
              width: 310px;
              margin-left: auto;
              border-collapse: collapse;
            }

            .totals-row {
              border-bottom: none;
            }

            .totals-cell {
              background-color: white;
              padding: 8px 16px;
              font-size: 14px;
            }

            .totals-label {
              text-align: left;
              font-weight: bold;
            }

            .totals-value {
              text-align: center;
            }

            .footer-section {
              text-align: center;
              margin-top: 0px;
              position: absolute;
              bottom: 0;
              width: 100%;
              font-family: serif;
            }

            .chamber-info {
              margin-bottom: 8px;
            }

            .chamber-title {
              font-weight: bold;
              color: #1e3a8a;
              font-size: 18px;
              margin-bottom: 5px;
              transform: scaleY(0.75);
            }

            .chamber-details {
              font-size: 16px;
              line-height: 1.2;
              color: #1f2937;
              margin-top: 0px;
            }

            .contact-info {
              display: flex;
              justify-content: center;
              align-items: center;
              font-size: 14px;
              margin-top: 12px;
              border: 1px solid #000;
              padding: 8px;
              gap: 10px;
              margin-left: 100px;
              margin-right: 100px;
            }

            .contact-item {
              display: flex;
              align-items: center;
              margin: 0 5px;
            }

            .contact-icon {
              width: 16px;
              height: 16px;
              margin-right: 4px;
            }

            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <!-- Header Section -->
            <div class="header-section">
              <div class="header-content">
                <!-- Logo and Branch -->
                <div class="logo-section">
                  <div class="logo-container">
                    <img src="/life_dental_logo.png" alt="Life Dental Clinic Logo" width="auto" height="120" />
                  </div>
                  <div class="branch-info">
                    <span class="branch-text">${invoice.branch}</span>
                  </div>
                </div>

                <!-- Invoice Number and Date -->
                <div class="right-section">
                  <div class="invoice-number">
                    <p>${invoice.invoiceNo}</p>
                  </div>
                  <div class="date-section">
                    <span class="date-label">DATE : </span>
                    <span class="date-value">${invoice.createdAt.toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
              </div>
            </div>

            <hr class="divider" />

            <!-- Patient Info -->
            <div class="patient-section">
              <div class="patient-row">
                <span class="patient-label">NAME :</span>
                <span class="patient-value">${invoice.patientName}</span>
              </div>
              <div class="patient-row">
                <span class="patient-label">PATIENT ID :</span>
                <span class="patient-value">${invoice.patientId}</span>
              </div>
              <div class="patient-row">
                <span class="patient-label">PHONE :</span>
                <span class="patient-value">${invoice.patientMobile}</span>
              </div>
              <div class="patient-row">
                <span class="patient-label">CORPORATE ID :</span>
                <span class="patient-value">${invoice.corporateId}</span>
              </div>
            </div>

            ${appointmentInfo ? `
            <div class="patient-section">
              <div class="patient-row">
                <span class="patient-label">APPOINTMENT :</span>
                <span class="patient-value">${appointmentInfo.formattedDate}</span>
              </div>
              <div class="patient-row">
                <span class="patient-label">STATUS :</span>
                <span class="patient-value">${appointmentInfo.status}</span>
              </div>
              ${appointmentInfo.reason ? `
              <div class="patient-row">
                <span class="patient-label">REASON :</span>
                <span class="patient-value">${appointmentInfo.reason}</span>
              </div>` : ''}
              ${appointmentInfo.branch ? `
              <div class="patient-row">
                <span class="patient-label">BRANCH :</span>
                <span class="patient-value">${appointmentInfo.branch}</span>
              </div>` : ''}
            </div>
            ` : ''}

            <div class="table-section">
              <table class="main-table">
                <thead class="table-header">
                  <tr>
                    <th class="header-cell" style="width: 300px;">DESCRIPTION</th>
                    <th class="header-cell" style="width: 60px;">QTY</th>
                    <th class="header-cell" style="width: 120px;">UNIT PRICE</th>
                    <th class="header-cell" style="width: 60px;">TOTAL</th>
                    <th class="header-cell" style="width: 60px;">DISCOUNT</th>
                    <th class="header-cell" style="width: 140px;">TOTAL AFTER DISCOUNT</th>
                  </tr>
                </thead>
                <tbody class="table-body">
                  ${invoice.items.map((item, index) => `
                    <tr>
                      <td class="body-cell">
                        ${index + 1}. ${item.productName}
                      </td>
                      <td class="body-cell center">
                        ${item.quantity}
                      </td>
                      <td class="body-cell center">
                        ${Number(item.unitPrice).toFixed(0)}/-
                      </td>
                      <td class="body-cell center">
                        ${Number(item.unitPrice * item.quantity).toFixed(0)}/-
                      </td>
                      <td class="body-cell center">
                        ${item.discount > 0 ? `${item.discount}${item.discountType === 'percentage' ? '%' : '/-'}` : '-'}
                      </td>
                      <td class="body-cell center">
                        ${Number(item.total).toFixed(0)}/-
                      </td>
                    </tr>
                  `).join('')}

                  ${Array.from({ length: Math.max(2, 8 - invoice.items.length) }, () => `
                    <tr>
                      <td class="body-cell white-border" style="min-height: 60px;"></td>
                      <td class="body-cell white-border"></td>
                      <td class="body-cell white-border"></td>
                      <td class="body-cell white-border"></td>
                      <td class="body-cell white-border"></td>
                      <td class="body-cell white-border"></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <table class="totals-table" style="width:348px;">
                <tbody>
                  <tr class="totals-row">
                    <td class="totals-cell totals-label" colspan="3">TOTAL :</td>
                    <td class="totals-cell totals-value">${Number(invoice.subtotal).toFixed(0)}/-</td>
                  </tr>
                  ${invoice.items.some(item => item.discount > 0) ? `
                  <tr class="totals-row">
                    <td class="totals-cell totals-label" colspan="3">ITEM DISCOUNTS :</td>
                    <td class="totals-cell totals-value">${invoice.items.reduce((sum, item) => sum + item.discountAmount, 0).toFixed(0)}/-</td>
                  </tr>
                  ` : ''}
                  ${Number(invoice.discountAmount) > 0 ? `
                  <tr class="totals-row">
                    <td class="totals-cell totals-label" colspan="3">ADDITIONAL DISCOUNT :</td>
                    <td class="totals-cell totals-value">${Number(invoice.discountAmount).toFixed(0)}/-</td>
                  </tr>
                  ` : ''}
                  <tr class="totals-row">
                    <td class="totals-cell totals-label" colspan="3">GRAND TOTAL :</td>
                    <td class="totals-cell totals-value" style="font-weight: bold;">${Number(invoice.totalAmount).toFixed(0)}/-</td>
                  </tr>
                  ${Number(invoice.paidAmount) > 0 ? `
                  <tr class="totals-row">
                    <td class="totals-cell totals-label" colspan="3">PAID :</td>
                    <td class="totals-cell totals-value" style="color: green;">${Number(invoice.paidAmount).toFixed(0)}/-</td>
                  </tr>
                  <tr class="totals-row">
                    <td class="totals-cell totals-label" colspan="3">DUE :</td>
                    <td class="totals-cell totals-value" style="color: orange; font-weight: bold;">${(Number(invoice.totalAmount) - Number(invoice.paidAmount)).toFixed(0)}/-</td>
                  </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>

            <!-- Clinic Address Footer -->
            <div class="footer-section">
              <div class="chamber-info">
                <p class="chamber-title">Chamber : 1</p>
                <p class="chamber-details">
                  Karnafully Tower, Flat#4-A, (4th Floor), 63, S.S. Khaled Road, Kazir Dewri,<br />
                  Chattogram. Cell : 01978 519518
                </p>
              </div>

              <div class="chamber-info">
                <p class="chamber-title">Chamber : 2</p>
                <p class="chamber-details">
                  Siddik market 3rd Floor, Bus stand, Hathazari.<br />
                  Cell : 01705 236168
                </p>
              </div>

              <div class="contact-info">
                <div class="contact-item">
                  <img src="/mail.png" alt="Email Icon" class="contact-icon" />
                  <span>lifedentalclinicbd@gmail.com</span>
                </div>
                <div class="contact-item">
                  <img src="/facebook.png" alt="Facebook Icon" class="contact-icon" />
                  <span>Life Dental Clinic</span>
                </div>
                <div class="contact-item">
                  <img src="/website.png" alt="Website Icon" class="contact-icon" />
                  <span>www.lifedentalclinicbd.com</span>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleRefundSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setRefundError('');

    const numericAmount = Number(refundAmount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      setRefundError('Enter an amount greater than zero.');
      return;
    }

    if (numericAmount - 0.01 > refundableRemaining) {
      setRefundError('Amount exceeds the refundable balance.');
      return;
    }

    try {
      setRefundLoading(true);
      const response = await fetch('/api/credit-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: numericAmount,
          reason: refundReason || undefined
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? 'Failed to issue credit note.');
      }

      setShowRefundModal(false);
      setRefundAmount('');
      setRefundReason('');
      router.refresh();
    } catch (err) {
      console.error(err);
      setRefundError(err instanceof Error ? err.message : 'Failed to issue credit note.');
    } finally {
      setRefundLoading(false);
    }
  };

  const handleDeleteInvoice = async () => {
    const response = await fetch(`/api/invoices`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: invoice.id }),
    });
    if (response.status === 200) {
      router.push('/invoices');
    }
    else {
      console.log("Error deleting invoice");
    }
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header with actions */}
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Invoice #{invoice.invoiceNo}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Created on {invoice.createdAt.toLocaleDateString()}
            </p>
            <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadge}`}>
              {invoice.status.toUpperCase()}
            </span>
          </div>
          <div className="space-x-2">
            <Link
              href={`/invoices/${invoice.id}/edit`}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Edit Invoice
            </Link>
            <button
              onClick={handlePrint}
              className="bg-green-600 hover:bg-green-700 cursor-pointer text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Print PDF
            </button>
            {refundableRemaining > 0 && (
              <button
                onClick={() => setShowRefundModal(true)}
                className="bg-purple-600 hover:bg-purple-700 cursor-pointer text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Issue Credit Note
              </button>
            )}
            <button
              onClick={handleDeleteInvoice}
              className="bg-red-600 hover:bg-red-700 cursor-pointer text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Delete Invoice
            </button>
          </div>
        </div>
      </div>
      <div className="px-4 py-4 border-b border-gray-100 bg-gray-50">
        <dl className="grid grid-cols-1 gap-4 text-sm text-gray-600 sm:grid-cols-3">
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <dt className="font-medium text-gray-500">Credits Applied</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              ৳{invoice.creditAppliedAmount.toFixed(2)}
            </dd>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <dt className="font-medium text-gray-500">Refunded to Date</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              ৳{invoice.refundedAmount.toFixed(2)}
            </dd>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <dt className="font-medium text-gray-500">Refundable Balance</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              ৳{refundableRemaining.toFixed(2)}
            </dd>
          </div>
        </dl>
      </div>

      {appointmentInfo && (
        <div className="mx-4 my-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-900">
            Linked Appointment • {appointmentInfo.formattedDate}
          </p>
          <div className="mt-1 flex flex-wrap gap-4 text-xs text-blue-800">
            <span>Status: {appointmentInfo.status.replace('_', ' ')}</span>
            {appointmentInfo.reason && <span>Reason: {appointmentInfo.reason}</span>}
            {appointmentInfo.branch && <span>Branch: {appointmentInfo.branch}</span>}
          </div>
        </div>
      )}

      {appliedCreditList.length > 0 && (
        <div className="mx-4 my-4 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-4">
          <h4 className="text-sm font-semibold text-indigo-900">Credits Applied to this Invoice</h4>
          <ul className="mt-2 space-y-1 text-sm text-indigo-800">
            {appliedCreditList.map((credit) => (
              <li key={credit.id} className="flex justify-between">
                <span>{credit.creditNo}</span>
                <span>৳{credit.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mx-4 my-4 rounded-md border border-gray-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Credit Notes & Refunds</h4>
            <p className="text-xs text-gray-500">Track issued credit notes and how they were applied.</p>
          </div>
          {refundableRemaining > 0 && (
            <button
              onClick={() => setShowRefundModal(true)}
              className="text-sm font-medium text-purple-600 hover:text-purple-800"
            >
              + Issue Credit Note
            </button>
          )}
        </div>

        {creditNotes.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No credit notes have been issued for this invoice yet.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {creditNotes.map((note) => {
              const badgeStyle =
                note.status === 'closed'
                  ? 'bg-green-100 text-green-800'
                  : note.status === 'partial'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800';
              return (
                <div key={note.id} className="rounded-md border border-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{note.creditNo}</p>
                      <p className="text-xs text-gray-500">
                        {note.type.toUpperCase()} • {new Date(note.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyle}`}>
                      {note.status.toUpperCase()}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 sm:grid-cols-4">
                    <div>
                      <dt className="text-gray-500">Issued Amount</dt>
                      <dd className="font-medium text-gray-900">৳{note.totalAmount.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Remaining</dt>
                      <dd className="font-medium text-gray-900">৳{note.remainingAmount.toFixed(2)}</dd>
                    </div>
                    {note.reason && (
                      <div className="col-span-2 sm:col-span-1">
                        <dt className="text-gray-500">Reason</dt>
                        <dd className="font-medium text-gray-900">{note.reason}</dd>
                      </div>
                    )}
                  </dl>
                  {note.applications.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-500">Applied To</p>
                      <ul className="mt-1 space-y-1 text-xs text-gray-700">
                        {note.applications.map((application) => (
                          <li key={application.id} className="flex justify-between">
                            <span>Invoice #{application.appliedInvoiceNo || application.appliedInvoiceId}</span>
                            <span>৳{application.appliedAmount.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoice content for PDF generation - Exact Dental Clinic Format */}
      <div id="invoice-content" className="pt-8 bg-white relative" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header Section */}
        <div className="mb-4 px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="w-32 h-32 mr-6 flex flex-col items-center">
              <Image
                src="/life_dental_logo.png"
                alt="Life Dental Clinic Logo"
                width={200}
                height={200}
                priority
                onError={(e) => {
                  console.error('Image failed to load:', e);
                }}
              />
              <div className="text-left">
                <span className="text-sm font-medium text-[#2B2369]">{invoice.branch}</span>
              </div>
            </div>

            <div>
              <div className="flex-1 ml-5">
                <p className='text-right'>{invoice.invoiceNo}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-[#2B2369]">DATE : </span>
                <span className="border-b border-dotted border-gray-600" style={{ borderBottomStyle: 'dotted', paddingBottom: '1px' }}>
                  {invoice.createdAt.toLocaleDateString('en-GB')}
                </span>
              </div>
            </div>
          </div>
        </div>
        <hr className="border-t-2 border-black mb-8" />

        {/* Patient Info */}
        <div className="px-8 mb-8 space-y-4 font-semibold grid grid-cols-2">
          <div className="flex items-center">
            <span className="text-sm mr-2 font-semibold">NAME :</span>
            <span className="border-b border-dotted border-gray-600 flex-1 pb-1" style={{ borderBottomStyle: 'dotted' }}>
              {invoice.patientName}
            </span>
          </div>
          <div className="flex items-center">
            <span className="text-sm mr-2 font-semibold">PATIENT ID :</span>
            <span className="border-b border-dotted border-gray-600 flex-1 pb-1" style={{ borderBottomStyle: 'dotted' }}>
              {invoice.patientId}
            </span>
          </div>
          <div className="flex items-center">
            <span className="text-sm mr-2 font-semibold">PHONE :</span>
            <span className="border-b border-dotted border-gray-600 flex-1 pb-1" style={{ borderBottomStyle: 'dotted' }}>
              {invoice.patientMobile}
            </span>
          </div>
          <div className="flex items-center">
            <span className="text-sm mr-2 font-semibold">CORPORATE ID :</span>
            <span className="border-b border-dotted border-gray-600 flex-1 pb-1" style={{ borderBottomStyle: 'dotted' }}>
              {invoice.corporateId}
            </span>
          </div>
        </div>

        <div className={"px-8"}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="p-4 text-center font-bold text-sm" style={{ width: '300px' }}>DESCRIPTION</th>
                <th className="p-4 text-center font-bold text-sm" style={{ width: '60px' }}>QTY</th>
                <th className="p-4 text-center font-bold text-sm" style={{ width: '120px' }}>UNIT PRICE</th>
                <th className="p-4 text-center font-bold text-sm" style={{ width: '60px' }}>TOTAL</th>
                <th className="p-4 text-center font-bold text-sm" style={{ width: '60px' }}>DISCOUNT</th>
                <th className="p-4 text-center font-bold text-sm" style={{ width: '140px' }}>TOTAL AFTER DISCOUNT</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 align-top text-sm border-b" style={{ minHeight: '60px' }}>
                    {index + 1}. {item.productName}
                  </td>
                  <td className="px-4 py-2 text-center align-top text-sm border-b">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-2 text-center align-top text-sm border-b">
                    {Number(item.unitPrice).toFixed(0)}/-
                  </td>
                  <td className="px-4 py-2 text-center align-top text-sm border-b">
                    {Number(item.unitPrice * item.quantity).toFixed(0)}/-
                  </td>
                  <td className="px-4 py-2 text-center align-top text-sm border-b">
                    {item.discount > 0 ? `${item.discount}${item.discountType === 'percentage' ? '%' : '/-'}` : '-'}
                  </td>
                  <td className="px-4 py-2 text-center align-top text-sm border-b">
                    {Number(item.total).toFixed(0)}/-
                  </td>
                </tr>
              ))}

              {/* Add empty rows if needed */}
              {Array.from({ length: Math.max(2, 8 - invoice.items.length) }, (_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="p-4" style={{ minHeight: '60px' }}></td>
                  <td className="p-4"></td>
                  <td className="p-4"></td>
                  <td className="p-4"></td>
                  <td className="p-4"></td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className={"ml-auto"} style={{ width: "310px" }}>
            <tbody>
              <tr>
                <td colSpan={3} className="px-4 py-2 text-left font-bold text-sm">TOTAL :</td>
                <td className="px-4 py-2 text-center text-sm">{Number(invoice.subtotal).toFixed(0)}/-</td>
              </tr>
              {invoice.items.some(item => item.discount > 0) && (
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-left font-bold text-sm">ITEM DISCOUNTS :</td>
                  <td className="px-4 py-2 text-center text-sm">{invoice.items.reduce((sum, item) => sum + item.discountAmount, 0).toFixed(0)}/-</td>
                </tr>
              )}
              {Number(invoice.discountAmount) > 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-left font-bold text-sm">ADDITIONAL DISCOUNT :</td>
                  <td className="px-4 py-2 text-center text-sm">{Number(invoice.discountAmount).toFixed(0)}/-</td>
                </tr>
              )}
              <tr>
                <td colSpan={3} className="px-4 py-2 text-left font-bold text-sm">GRAND TOTAL :</td>
                <td className="px-4 py-2 text-center font-bold text-sm">{Number(invoice.totalAmount).toFixed(0)}/-</td>
              </tr>
              {Number(invoice.paidAmount) > 0 && (
                <>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-left font-bold text-sm text-green-600">PAID :</td>
                    <td className="px-4 py-2 text-center text-sm text-green-600">{Number(invoice.paidAmount).toFixed(0)}/-</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-left font-bold text-sm text-orange-600">DUE :</td>
                    <td className="px-4 py-2 text-center font-bold text-sm text-orange-600">{(Number(invoice.totalAmount) - Number(invoice.paidAmount)).toFixed(0)}/-</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Clinic Address Footer */}
        <div className="font-serif text-center mt-16 space-y-2">
          <div>
            <p className="text-[20px] font-bold text-blue-900 text-base transform scale-y-75">Chamber : 1</p>
            <p className="text-base leading-relaxed text-gray-800">
              Karnafully Tower, Flat#4-A, (4th Floor), 63, S.S. Khaled Road, Kazir Dewri,<br />
              Chattogram.  Cell : <span className="font-sans">01978 519518</span>
            </p>
          </div>

          <div>
            <p className="text-[20px] font-bold text-blue-900 text-base transform scale-y-75">Chamber : 2</p>
            <p className="text-base leading-relaxed text-gray-800">
              Siddik market 3rd Floor, Bus stand, Hathazari.
            </p>
            <p className="text-base leading-relaxed text-gray-800">
              Cell : <span className="font-sans">01705 236168</span>
            </p>
          </div>

          <div className="flex justify-center items-center space-x-3 text-sm mt-3 border mx-30">
            <div className="flex items-center">
              <span className="mr-1">
                <img src="/mail.png" alt="Email Icon" className="w-4 h-4" />
              </span>
              <span>lifedentalclinicbd@gmail.com</span>
            </div>
            <div className="flex items-center">
              <span className="mr-1">
                <img src="/facebook.png" alt="Email Icon" className="w-4 h-4" />
              </span>
              <span>Life Dental Clinic</span>
            </div>
            <div className="flex items-center">
              <span className="mr-1">
                <img src="/website.png" alt="Email Icon" className="w-4 h-4" />
              </span>
              <span>www.lifedentalclinicbd.com</span>
            </div>
          </div>
        </div>
      </div>
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Issue Credit Note</h3>
            <p className="mt-1 text-sm text-gray-500">
              Refundable balance: ৳{refundableRemaining.toFixed(2)}
            </p>
            <form onSubmit={handleRefundSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount (৳)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={refundableRemaining}
                  value={refundAmount}
                  onChange={(event) => setRefundAmount(event.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reason (optional)
                </label>
                <textarea
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 py-2 px-3 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 sm:text-sm"
                  rows={3}
                  placeholder="Enter a note for this refund"
                />
              </div>
              {refundError && <p className="text-sm text-red-600">{refundError}</p>}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRefundModal(false);
                    setRefundError('');
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundLoading}
                  className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-500 disabled:opacity-50"
                >
                  {refundLoading ? 'Issuing…' : 'Issue Credit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
