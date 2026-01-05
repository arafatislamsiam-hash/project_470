'use client';

import { useCallback, useEffect, useState } from 'react';

type NotificationData = {
  invoiceId?: string;
  invoiceNo?: string;
  status?: string;
  roleName?: string;
  [key: string]: unknown;
};

type NotificationItem = {
  id: string;
  type: 'invoice_status' | 'user_assignment';
  title: string;
  message?: string | null;
  createdAt: string;
  isRead: boolean;
  data?: NotificationData | null;
};

const typeBadges: Record<NotificationItem['type'], string> = {
  invoice_status: 'bg-blue-100 text-blue-800',
  user_assignment: 'bg-green-100 text-green-700'
};

const typeLabels: Record<NotificationItem['type'], string> = {
  invoice_status: 'Invoice',
  user_assignment: 'Assignment'
};

const formatRelativeTime = (timestamp: string) => {
  const delta = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.max(0, Math.floor(delta / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/notifications?limit=12', {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error('Unable to load notifications');
      }
      const data = await response.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const toggleOpen = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  const markNotifications = async (ids?: string[]) => {
    if (!ids?.length && unreadCount === 0) {
      return;
    }
    try {
      setMarking(true);
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          ids?.length ? { ids } : { markAll: true }
        )
      });

      if (!response.ok) {
        throw new Error('Unable to update notifications');
      }

      const data = await response.json();
      const updatedUnread = data.unreadCount ?? 0;
      setUnreadCount(updatedUnread);

      setNotifications((prev) =>
        prev.map((notification) =>
          ids?.includes(notification.id) || (!ids && !notification.isRead)
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to update notifications');
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative p-2 text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-4 text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-lg shadow-lg border border-gray-100 z-50">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              <p className="text-xs text-gray-500">
                {unreadCount > 0
                  ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}`
                  : 'All caught up'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => markNotifications()}
              disabled={unreadCount === 0 || marking}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            >
              Mark all as read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-4 text-sm text-gray-500">Loading notifications…</div>
            ) : error ? (
              <div className="p-4 text-sm text-red-600">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No notifications yet.</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 text-sm ${notification.isRead ? 'bg-white' : 'bg-blue-50'
                    }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeBadges[notification.type]}`}
                    >
                      {typeLabels[notification.type]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900">{notification.title}</p>
                  {notification.message && (
                    <p className="text-gray-600 mt-1">{notification.message}</p>
                  )}
                  {notification.type === 'invoice_status' && notification.data?.invoiceNo && (
                    <p className="text-xs text-gray-500 mt-1">
                      Invoice #{String(notification.data.invoiceNo)}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => markNotifications([notification.id])}
                      disabled={notification.isRead || marking}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                    >
                      {notification.isRead ? 'Read' : 'Mark as read'}
                    </button>
                    {notification.type === 'invoice_status' && notification.data?.status && (
                      <span className="text-xs text-gray-500 capitalize">
                        Status: {String(notification.data.status)}
                      </span>
                    )}
                    {notification.type === 'user_assignment' && notification.data?.roleName && (
                      <span className="text-xs text-gray-500">
                        Role: {String(notification.data.roleName)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
