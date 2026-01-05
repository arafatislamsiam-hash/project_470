import Navigation from '@/components/navigation';
import { getDashboardSummary } from '@/server/services/dashboardService';
import { getServerSession } from 'next-auth';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    return null;
  }

  // Get stats
  const { totalUsers, totalProducts, totalCategories, totalInvoices, recentInvoices } =
    await getDashboardSummary();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Welcome back, {session.user.name}!
          </h1>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">U</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Users
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {totalUsers}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">P</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Products
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {totalProducts}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">C</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Categories
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {totalCategories}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">I</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Invoices
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {totalInvoices}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recent Invoices
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Latest invoice activity in your system.
              </p>
            </div>
            <div className="border-t border-gray-200">
              {recentInvoices.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {recentInvoices.map((invoice) => (
                    <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                      <li className="px-4 py-4 sm:px-6 cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="shrink-0">
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
                                Created by {invoice.user.name} • {invoice.items.length} items
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              ৳{Number(invoice.totalAmount).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {invoice.createdAt.toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </li>
                    </Link>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-6 text-center text-gray-500">
                  No invoices created yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
