'use client';

import Navigation from '@/components/navigation';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        }),
      });

      if (response.ok) {
        setSuccess('Password changed successfully');
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to change password');
      }
    } catch (error) {
      console.log(error)
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="max-w-md mx-auto bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Profile Settings
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Manage your account settings and preferences.
              </p>
            </div>

            <div className="border-t border-gray-200">
              <div className="px-4 py-5 sm:p-6">
                {/* User Info */}
                <div className="mb-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {session.user.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-lg font-medium text-gray-900">
                        {session.user.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {session.user.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Permissions Info */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Your Permissions</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(session.user.permissions).map(([permission, hasPermission]) =>
                      hasPermission && (
                        <span
                          key={permission}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                        >
                          {permission.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Change Password Form */}
                <div className="border-t pt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Change Password</h4>

                  {error && (
                    <div className="mb-4 rounded-md bg-red-50 p-4">
                      <div className="text-sm text-red-700">{error}</div>
                    </div>
                  )}

                  {success && (
                    <div className="mb-4 rounded-md bg-green-50 p-4">
                      <div className="text-sm text-green-700">{success}</div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm border"
                        placeholder="Enter current password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm border"
                        placeholder="Enter new password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm border"
                        placeholder="Confirm new password"
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
