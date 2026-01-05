'use client';

import type {
  BranchPerformanceRow,
  PerformanceForecast,
  PerformanceTargetWithProgress,
  SummaryMetrics
} from '@/lib/performance';
import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'BDT',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0
});

const formatCurrency = (value: number) => currencyFormatter.format(Math.round(value));

const formatPercent = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  return `${Math.round(value * 100)}%`;
};

const formatDateInput = (date: Date) =>
  date.toISOString().split('T')[0];

const formatDisplayDate = (value: string) =>
  new Date(value).toLocaleDateString();

type Props = {
  initialForecast: PerformanceForecast;
  initialTargets: PerformanceTargetWithProgress[];
};

const SummaryCard = ({
  title,
  summary
}: {
  title: string;
  summary: SummaryMetrics;
}) => (
  <div className="bg-white rounded-lg shadow p-6 flex flex-col gap-3">
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold text-gray-900">
        {formatCurrency(summary.actualRevenue)}
      </p>
      <p className="text-xs text-gray-500">
        Net: {formatCurrency(summary.actualProfit)}
      </p>
    </div>
    <div className="flex justify-between text-sm text-gray-600">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400">
          Forecast
        </p>
        <p>{formatCurrency(summary.forecastRevenue)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400">
          Projected
        </p>
        <p>{formatCurrency(summary.projectedRevenue)}</p>
      </div>
      <div className="text-right">
        <p className="text-xs uppercase tracking-wide text-gray-400">
          Target
        </p>
        <p>{formatCurrency(summary.targetRevenue)}</p>
      </div>
    </div>
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Revenue Progress</span>
        <span>{formatPercent(summary.revenueProgress)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-500 h-2"
          style={{
            width: `${Math.min(
              100,
              Math.max(0, (summary.revenueProgress ?? 0) * 100)
            )}%`
          }}
        />
      </div>
    </div>
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Profit Progress</span>
        <span>{formatPercent(summary.profitProgress)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-green-500 h-2"
          style={{
            width: `${Math.min(
              100,
              Math.max(0, (summary.profitProgress ?? 0) * 100)
            )}%`
          }}
        />
      </div>
    </div>
  </div>
);

const BranchRow = ({ row }: { row: BranchPerformanceRow }) => (
  <tr>
    <td className="px-4 py-3 text-sm font-medium text-gray-900">
      {row.branch}
    </td>
    <td className="px-4 py-3 text-sm text-gray-700">
      {formatCurrency(row.actualRevenue)}
    </td>
    <td className="px-4 py-3 text-sm text-gray-700">
      {formatCurrency(row.projectedRevenue)}
    </td>
    <td className="px-4 py-3 text-sm text-gray-700">
      {formatCurrency(row.targetRevenue)}
    </td>
    <td className="px-4 py-3 text-sm text-gray-700">
      {row.appointmentCount}
    </td>
    <td className="px-4 py-3 text-sm text-gray-700">
      {formatPercent(row.revenueProgress)}
    </td>
  </tr>
);

const TargetList = ({
  targets,
  onDelete,
  deletingId
}: {
  targets: PerformanceTargetWithProgress[];
  onDelete: (id: string) => void;
  deletingId: string | null;
}) => (
  <div className="space-y-4">
    {targets.length === 0 && (
      <p className="text-sm text-gray-500">
        No goals set yet. Add a target to begin tracking progress.
      </p>
    )}
    {targets.map((target) => (
      <div
        key={target.id}
        className="border border-gray-200 rounded-lg p-4 flex flex-col gap-2"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {target.name || 'Untitled Target'} · {target.periodType.toUpperCase()}
            </p>
            <p className="text-xs text-gray-500">
              {formatDisplayDate(target.periodStart)} –{' '}
              {formatDisplayDate(target.periodEnd)}
            </p>
            <p className="text-xs text-gray-500">
              {target.branch ? `Branch: ${target.branch}` : 'All Locations'}
              {target.team ? ` · Team: ${target.team}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDelete(target.id)}
            disabled={deletingId === target.id}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {deletingId === target.id ? 'Removing…' : 'Remove'}
          </button>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">
            Revenue {formatCurrency(target.revenueActual)} /{' '}
            {formatCurrency(target.revenueTarget)}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(0, (target.revenueProgress ?? 0) * 100)
                )}%`
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mb-1">
            Profit {formatCurrency(target.profitActual)} /{' '}
            {formatCurrency(target.profitTarget)}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(0, (target.profitProgress ?? 0) * 100)
                )}%`
              }}
            />
          </div>
        </div>
        {target.notes && (
          <p className="text-xs text-gray-500">{target.notes}</p>
        )}
      </div>
    ))}
  </div>
);

export default function PerformanceOverview({
  initialForecast,
  initialTargets
}: Props) {
  const [forecast, setForecast] = useState(initialForecast);
  const [targets, setTargets] = useState(initialTargets);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    setFetchError(null);
    try {
      const [forecastRes, targetsRes] = await Promise.all([
        fetch('/api/performance/forecast', { cache: 'no-store' }),
        fetch('/api/performance/targets', { cache: 'no-store' })
      ]);

      if (!forecastRes.ok) {
        throw new Error('Failed to fetch forecast');
      }

      if (!targetsRes.ok) {
        throw new Error('Failed to fetch targets');
      }

      const forecastData = await forecastRes.json();
      const targetData = await targetsRes.json();

      setForecast(forecastData);
      setTargets(targetData.targets ?? []);
    } catch (error) {
      console.error(error);
      setFetchError('Unable to refresh performance data right now.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Remove this target?')) {
        return;
      }
      setDeletingId(id);
      try {
        const res = await fetch(`/api/performance/targets/${id}`, {
          method: 'DELETE'
        });
        if (!res.ok) {
          throw new Error('Failed to delete target');
        }
        await refreshData();
      } catch (error) {
        console.error(error);
        setFetchError('Unable to delete target. Please try again.');
      } finally {
        setDeletingId(null);
      }
    },
    [refreshData]
  );

  const branchSuggestions = useMemo(
    () => Array.from(new Set(forecast.branchPerformance.map((row) => row.branch))),
    [forecast.branchPerformance]
  );
  const maxTrendRevenue = useMemo(
    () =>
      Math.max(
        1,
        ...forecast.trends.map((trend) => trend.revenue)
      ),
    [forecast.trends]
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Forecasting & Goal Tracking
          </h1>
          <p className="text-sm text-gray-500">
            Updated {new Date(forecast.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {fetchError && (
            <p className="text-sm text-red-600">{fetchError}</p>
          )}
          <button
            type="button"
            onClick={refreshData}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh data'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SummaryCard title="Current Month" summary={forecast.summary.month} />
        <SummaryCard title="Current Quarter" summary={forecast.summary.quarter} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Branch & Location Targets
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projected
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Upcoming
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {forecast.branchPerformance.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-4 text-sm text-gray-500 text-center"
                    >
                      No invoice data yet.
                    </td>
                  </tr>
                )}
                {forecast.branchPerformance.map((row) => (
                  <BranchRow key={row.branch} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Historical Pace
            </h2>
            <p className="text-sm text-gray-500">
              Monthly revenue vs. profit trend (last {forecast.trends.length}{' '}
              months)
            </p>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {forecast.trends.map((trend) => (
              <div key={trend.key}>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{trend.label}</span>
                  <span>{formatCurrency(trend.revenue)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, (trend.revenue / maxTrendRevenue) * 100)
                      )}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Net: {formatCurrency(trend.profit)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Upcoming workload
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Using average invoice value to forecast fulfillment capacity.
          </p>
          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500">Appointments this month</dt>
              <dd className="text-lg font-semibold text-gray-900">
                {forecast.appointments.month}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500">Appointments this quarter</dt>
              <dd className="text-lg font-semibold text-gray-900">
                {forecast.appointments.quarter}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500">Avg. invoice revenue</dt>
              <dd className="text-lg font-semibold text-gray-900">
                {formatCurrency(forecast.assumptions.averageInvoiceRevenue)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-500">Avg. invoice profit</dt>
              <dd className="text-lg font-semibold text-gray-900">
                {formatCurrency(forecast.assumptions.averageInvoiceProfit)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Add monthly / quarterly target
          </h2>
          <TargetForm
            onSuccess={refreshData}
            branchSuggestions={branchSuggestions}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Goal progress
          </h2>
          <p className="text-sm text-gray-500">
            Tracking {targets.length} active target(s)
          </p>
        </div>
        <TargetList
          targets={targets}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      </div>
    </div>
  );
}

const TargetForm = ({
  onSuccess,
  branchSuggestions
}: {
  onSuccess: () => Promise<void>;
  branchSuggestions: string[];
}) => {
  const now = new Date();
  const monthStart = formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const [values, setValues] = useState({
    name: '',
    periodType: 'monthly',
    periodStart: monthStart,
    periodEnd: monthEnd,
    branch: '',
    team: '',
    revenueTarget: '',
    profitTarget: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'periodType') {
        const startDate = new Date(next.periodStart);
        next.periodEnd = formatDateInput(
          value === 'quarterly'
            ? new Date(startDate.getFullYear(), startDate.getMonth() + 3, 0)
            : new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
        );
      }
      if (name === 'periodStart') {
        const startDate = new Date(value);
        next.periodEnd = formatDateInput(
          next.periodType === 'quarterly'
            ? new Date(startDate.getFullYear(), startDate.getMonth() + 3, 0)
            : new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
        );
      }
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/performance/targets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...values,
          revenueTarget: Number(values.revenueTarget || 0),
          profitTarget: Number(values.profitTarget || 0)
        })
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to create target');
      }

      setValues({
        name: '',
        periodType: values.periodType,
        periodStart: monthStart,
        periodEnd: values.periodType === 'monthly'
          ? monthEnd
          : formatDateInput(new Date(now.getFullYear(), now.getMonth() + 3, 0)),
        branch: '',
        team: '',
        revenueTarget: '',
        profitTarget: '',
        notes: ''
      });

      await onSuccess();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : 'Unable to create target.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          type="text"
          name="name"
          value={values.name}
          onChange={handleChange}
          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="e.g. Downtown Q1 Goal"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Period
          </label>
          <select
            name="periodType"
            value={values.periodType}
            onChange={handleChange}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Branch / Location
          </label>
          <input
            type="text"
            name="branch"
            list="branch-options"
            value={values.branch}
            onChange={handleChange}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="All locations"
          />
          <datalist id="branch-options">
            {branchSuggestions.map((branch) => (
              <option key={branch} value={branch} />
            ))}
          </datalist>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Team / Role
        </label>
        <input
          type="text"
          name="team"
          value={values.team}
          onChange={handleChange}
          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="Optional"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Period start
          </label>
          <input
            type="date"
            name="periodStart"
            value={values.periodStart}
            onChange={handleChange}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Period end
          </label>
          <input
            type="date"
            name="periodEnd"
            value={values.periodEnd}
            onChange={handleChange}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Revenue target
          </label>
          <input
            type="number"
            min="0"
            name="revenueTarget"
            value={values.revenueTarget}
            onChange={handleChange}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Profit target
          </label>
          <input
            type="number"
            min="0"
            name="profitTarget"
            value={values.profitTarget}
            onChange={handleChange}
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="0"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          name="notes"
          value={values.notes}
          onChange={handleChange}
          rows={3}
          className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          placeholder="Context, campaign details, etc."
        />
      </div>
      <button
        type="submit"
        className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        disabled={submitting}
      >
        {submitting ? 'Saving…' : 'Save target'}
      </button>
    </form>
  );
};
