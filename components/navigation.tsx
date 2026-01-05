'use client';

import NotificationBell from '@/components/notification-bell';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function Navigation() {
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (!session) return null;

  const permissions = session.user.permissions;

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-28">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-gray-800">
              {/*Clinic Invoice Management*/}
              <Image
                src="/life_dental_logo.png"
                alt="Logo"
                width={80}
                height={80}
                priority
                onError={(e) => {
                  console.error('Image failed to load:', e);
                }}
              />
            </Link>

            <div className="hidden md:flex space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              {(permissions.CREATE_INVOICE || permissions.VIEW_ALL_INVOICES) && (
                <Link
                  href="/dashboard/performance"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Forecast &amp; Goals
                </Link>
              )}

              {permissions.CREATE_INVOICE && (
                <Link
                  href="/invoices/create"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Create Invoice
                </Link>
              )}

              {permissions.VIEW_ALL_INVOICES && (
                <Link
                  href="/invoices"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Invoices
                </Link>
              )}

              {permissions.MANAGE_PRODUCTS && (
                <Link
                  href="/products"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Products
                </Link>
              )}

              {permissions.MANAGE_PATIENT && (
                <Link
                  href="/patients"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Patients
                </Link>
              )}
              {(permissions.MANAGE_PATIENT || permissions.CREATE_INVOICE) && (
                <Link
                  href="/appointments"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Appointments
                </Link>
              )}

              {permissions.MANAGE_CATEGORIES && (
                <Link
                  href="/categories"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Categories
                </Link>
              )}

              {permissions.CREATE_USER && (
                <Link
                  href="/users"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Users
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <NotificationBell />
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span className="mr-2">{session.user.name}</span>
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  {session.user.name?.charAt(0).toUpperCase()}
                </div>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 bg-white rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    {session.user.email}
                  </div>
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
          >
            Dashboard
          </Link>
          {(permissions.CREATE_INVOICE || permissions.VIEW_ALL_INVOICES) && (
            <Link
              href="/dashboard/performance"
              className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
            >
              Forecast &amp; Goals
            </Link>
          )}

          {permissions.CREATE_INVOICE && (
            <Link
              href="/invoices/create"
              className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
            >
              Create Invoice
            </Link>
          )}

          {permissions.MANAGE_PRODUCTS && (
            <Link
              href="/products"
              className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
            >
              Products
            </Link>
          )}

          {permissions.MANAGE_PATIENT && (
            <Link
              href="/patients"
              className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
            >
              Patients
            </Link>
          )}
          {(permissions.MANAGE_PATIENT || permissions.CREATE_INVOICE) && (
            <Link
              href="/appointments"
              className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
            >
              Appointments
            </Link>
          )}

          {permissions.MANAGE_CATEGORIES && (
            <Link
              href="/categories"
              className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
            >
              Categories
            </Link>
          )}

          {permissions.CREATE_USER && (
            <Link
              href="/users"
              className="text-gray-600 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium"
            >
              Users
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
