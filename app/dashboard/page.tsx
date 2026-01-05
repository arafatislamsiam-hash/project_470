import Navigation from '@/components/navigation';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    return null;
  }

  // Get stats
  const [
    totalUsers,
    totalProducts,
    totalCategories,
    totalInvoices,
    recentInvoices,
    lowStockCandidates
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.category.count(),
    prisma.invoice.count(),
    prisma.invoice.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } }
      }
    }),
    prisma.product.findMany({
      where: {
        lowStockThreshold: { gt: 0 }
      },
      include: {
        category: {
          select: {
            title: true
          }
        }
      },
      orderBy: { stockQuantity: 'asc' }
    })
  ]);

  const lowStockAlerts = lowStockCandidates.filter(
    (product) => product.stockQuantity <= product.lowStockThreshold
  );
  const lowStockCount = lowStockAlerts.length;
  const lowStockProducts = lowStockAlerts.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Welcome back, {session.user.name}!
          </h1>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
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
                  <div className="flex-shrink-0">
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
                  <div className="flex-shrink-0">
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
                  <div className="flex-shrink-0">
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
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">L</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Low Stock Products
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {lowStockCount}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          {lowStockProducts.length > 0 && (
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Inventory Alerts
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Products that reached their low-stock threshold.
                  </p>
                </div>
                <Link
                  href="/products"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Manage Inventory
                </Link>
              </div>
              <div className="border-t border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {lowStockProducts.map((product) => (
                    <li key={product.id} className="px-4 py-4 sm:px-6 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {product.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {product.category?.title || 'Uncategorised'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-red-600">
                          {product.stockQuantity} unit{product.stockQuantity === 1 ? '' : 's'} left
                        </p>
                        <p className="text-xs text-gray-500">
                          Threshold: {product.lowStockThreshold}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

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
