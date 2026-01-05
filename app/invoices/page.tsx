'use client';

import Navigation from '@/components/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface InvoiceItem {
  id: string;
  name: string;
  price: number;
  product: {
    name: string;
  };
}

interface Invoice {
  id: string;
  invoiceNo: string;
  patient: {
    id: string;
    patientName: string;
    patientMobile: string;
  };
  user: {
    name: string;
    email: string;
  };
  items: InvoiceItem[];
  totalAmount: number;
  createdAt: string;
}

interface InvoicesResponse {
  invoices: Invoice[];
  totalInvoices: number;
  totalPages: number;
  currentPage: number;
}

export default function Invoices() {
  const { data: session, status } = useSession();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);

  const fetchAllInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get total count
      const firstResponse = await fetch('/api/invoices?page=1&limit=10');
      if (!firstResponse.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const firstData: InvoicesResponse = await firstResponse.json();
      setTotalInvoices(firstData.totalInvoices);

      // If we have more than 10 invoices, fetch all pages
      if (firstData.totalPages > 1) {
        const allInvoicesData: Invoice[] = [...firstData.invoices];

        // Fetch remaining pages
        for (let page = 2; page <= firstData.totalPages; page++) {
          const response = await fetch(`/api/invoices?page=${page}&limit=10`);
          if (response.ok) {
            const data: InvoicesResponse = await response.json();
            allInvoicesData.push(...data.invoices);
          }
        }

        setAllInvoices(allInvoicesData);
      } else {
        setAllInvoices(firstData.invoices);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchAllInvoices();
    }
  }, [status]);



  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handlePhoneFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneFilter(value);
  };

  // Filter invoices based on search term and phone filter
  const filteredInvoices = allInvoices.filter(invoice => {
    const matchesInvoiceNo = invoice.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPhone = phoneFilter === '' || invoice.patient.patientMobile.includes(phoneFilter);
    return matchesInvoiceNo && matchesPhone;
  });

  // Calculate pagination for filtered results
  const itemsPerPage = 10;
  const totalFilteredItems = filteredInvoices.length;
  const totalFilteredPages = Math.ceil(totalFilteredItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  // Reset to page 1 when search results change
  useEffect(() => {
    if (currentPage > totalFilteredPages && totalFilteredPages > 0) {
      setCurrentPage(1);
    }
  }, [totalFilteredPages, currentPage]);



  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to view invoices.</p>
        </div>
      </div>
    );
  }

  const renderPagination = () => {
    if (totalFilteredPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalFilteredPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(Math.min(totalFilteredPages, currentPage + 1))}
            disabled={currentPage === totalFilteredPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">
                {totalFilteredItems > 0 ? startIndex + 1 : 0}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(endIndex, totalFilteredItems)}
              </span>{' '}
              of <span className="font-medium">{totalFilteredItems}</span> results
              {searchTerm && ` (filtered from ${totalInvoices} total)`}
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {pages.map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === currentPage
                    ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalFilteredPages, currentPage + 1))}
                disabled={currentPage === totalFilteredPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Invoices
                </h3>
              </div>
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="Search by invoice number..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Filter by patient phone..."
                  value={phoneFilter}
                  onChange={handlePhoneFilterChange}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="border-t border-gray-200">
              {loading ? (
                <div className="px-4 py-6 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  Loading invoices...
                </div>
              ) : error ? (
                <div className="px-4 py-6 text-center text-red-500">
                  Error: {error}
                </div>
              ) : paginatedInvoices.length > 0 ? (
                <>
                  <ul className="divide-y divide-gray-200">
                    {paginatedInvoices.map((invoice) => (
                      <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                        <li className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                                  <span className="text-gray-600 font-bold">
                                    {invoice.invoiceNo.slice(-2)}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  Invoice #{invoice.invoiceNo}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {invoice.patient.patientName} ({invoice.patient.patientMobile})
                                </div>
                                <div className="text-sm text-gray-500">
                                  Created by {invoice.user.name} • {invoice.items.length} items
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                ৳{Number(invoice.totalAmount).toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(invoice.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </li>
                      </Link>
                    ))}
                  </ul>
                  {renderPagination()}
                </>
              ) : (
                <div className="px-4 py-6 text-center text-gray-500">
                  {searchTerm || phoneFilter ? 'No invoices found matching your filters.' : 'No invoices created yet.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
