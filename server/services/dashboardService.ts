import { getDashboardCounts, getRecentInvoices } from '@/server/repositories/dashboardRepository';

export async function getDashboardSummary(takeRecent = 5) {
  const [counts, recentInvoices] = await Promise.all([
    getDashboardCounts(),
    getRecentInvoices(takeRecent),
  ]);

  return {
    ...counts,
    recentInvoices,
  };
}
