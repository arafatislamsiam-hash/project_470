import { prisma } from '@/lib/db';
import type { PerformanceTarget, Prisma } from '@prisma/client';

const DEFAULT_MONTH_LOOKBACK = 6;
const SUPPORTED_PERIODS = ['monthly', 'quarterly'] as const;
type SupportedPeriod = (typeof SUPPORTED_PERIODS)[number];

const toNumber = (value: Prisma.Decimal | number | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  return parseFloat(value.toString());
};

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const monthLabel = (date: Date) =>
  date.toLocaleString('default', { month: 'short', year: 'numeric' });

const startOfQuarter = (date: Date) =>
  new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);

const endOfQuarter = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 3, 0, 23, 59, 59, 999);

const endOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

const rangesOverlap = (startA: Date, endA: Date, startB: Date, endB: Date) =>
  startA <= endB && endA >= startB;

const sanitizeBranchKey = (value: string | null) => value ?? 'Unassigned';

export type SummaryMetrics = {
  actualRevenue: number;
  actualProfit: number;
  forecastRevenue: number;
  forecastProfit: number;
  projectedRevenue: number;
  projectedProfit: number;
  targetRevenue: number;
  targetProfit: number;
  revenueProgress: number | null;
  profitProgress: number | null;
};

export type BranchPerformanceRow = {
  branch: string;
  actualRevenue: number;
  actualProfit: number;
  forecastRevenue: number;
  forecastProfit: number;
  projectedRevenue: number;
  projectedProfit: number;
  targetRevenue: number;
  targetProfit: number;
  appointmentCount: number;
  revenueProgress: number | null;
  profitProgress: number | null;
};

export type TrendPoint = {
  key: string;
  label: string;
  revenue: number;
  profit: number;
};

export type PerformanceTargetWithProgress = {
  id: string;
  name: string | null;
  periodType: SupportedPeriod;
  periodStart: string;
  periodEnd: string;
  branch: string | null;
  team: string | null;
  revenueTarget: number;
  profitTarget: number;
  revenueActual: number;
  profitActual: number;
  revenueProgress: number | null;
  profitProgress: number | null;
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
};

export type PerformanceForecast = {
  generatedAt: string;
  summary: {
    month: SummaryMetrics;
    quarter: SummaryMetrics;
  };
  trends: TrendPoint[];
  branchPerformance: BranchPerformanceRow[];
  appointments: {
    upcomingTotal: number;
    month: number;
    quarter: number;
  };
  assumptions: {
    averageInvoiceRevenue: number;
    averageInvoiceProfit: number;
  };
};

type ForecastOptions = {
  months?: number;
};

type TargetAccumulator = {
  revenue: number;
  profit: number;
};

const emptySummary = (): SummaryMetrics => ({
  actualRevenue: 0,
  actualProfit: 0,
  forecastRevenue: 0,
  forecastProfit: 0,
  projectedRevenue: 0,
  projectedProfit: 0,
  targetRevenue: 0,
  targetProfit: 0,
  revenueProgress: null,
  profitProgress: null
});

const buildTargetWhereInput = (
  target: PerformanceTarget
): Prisma.InvoiceWhereInput => {
  const where: Prisma.InvoiceWhereInput = {
    createdAt: {
      gte: target.periodStart,
      lte: target.periodEnd
    }
  };

  if (target.branch) {
    where.branch = target.branch;
  }

  if (target.team) {
    where.user = {
      roles: {
        some: {
          role: {
            name: target.team
          }
        }
      }
    };
  }

  return where;
};

const serializeTarget = (
  target: PerformanceTarget,
  actuals: { revenueActual: number; profitActual: number }
): PerformanceTargetWithProgress => {
  const revenueTarget = toNumber(target.revenueTarget);
  const profitTarget = toNumber(target.profitTarget);
  const revenueProgress =
    revenueTarget > 0 ? actuals.revenueActual / revenueTarget : null;
  const profitProgress =
    profitTarget > 0 ? actuals.profitActual / profitTarget : null;

  return {
    id: target.id,
    name: target.name,
    periodType: target.periodType as SupportedPeriod,
    periodStart: target.periodStart.toISOString(),
    periodEnd: target.periodEnd.toISOString(),
    branch: target.branch,
    team: target.team,
    revenueTarget,
    profitTarget,
    revenueActual: actuals.revenueActual,
    profitActual: actuals.profitActual,
    revenueProgress,
    profitProgress,
    notes: target.notes,
    createdAt: target.createdAt.toISOString(),
    createdBy: target.createdBy ?? null
  };
};

const aggregateTargetActuals = async (target: PerformanceTarget) => {
  const actuals = await prisma.invoice.aggregate({
    where: buildTargetWhereInput(target),
    _sum: {
      subtotal: true,
      totalAmount: true
    }
  });

  return {
    revenueActual: toNumber(actuals._sum.subtotal),
    profitActual: toNumber(actuals._sum.totalAmount)
  };
};

export async function getTargetsWithProgress(): Promise<
  PerformanceTargetWithProgress[]
> {
  const targets = await prisma.performanceTarget.findMany({
    orderBy: {
      periodStart: 'desc'
    }
  });

  const enriched = await Promise.all(
    targets.map(async (target) => {
      const actuals = await aggregateTargetActuals(target);
      return serializeTarget(target, actuals);
    })
  );

  return enriched;
}

export async function enrichTargetWithProgress(
  target: PerformanceTarget
): Promise<PerformanceTargetWithProgress> {
  const actuals = await aggregateTargetActuals(target);
  return serializeTarget(target, actuals);
}

export async function computePerformanceForecast(
  options: ForecastOptions = {}
): Promise<PerformanceForecast> {
  const months = Math.max(options.months ?? DEFAULT_MONTH_LOOKBACK, 1);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = endOfMonth(now);
  const quarterStart = startOfQuarter(now);
  const quarterEnd = endOfQuarter(quarterStart);
  const lookbackStart =
    quarterStart < new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
      ? quarterStart
      : new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const invoices = await prisma.invoice.findMany({
    where: {
      createdAt: {
        gte: lookbackStart
      }
    },
    select: {
      createdAt: true,
      subtotal: true,
      totalAmount: true,
      branch: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  const scheduledAppointments = await prisma.appointment.findMany({
    where: {
      status: 'scheduled',
      appointmentDate: {
        gte: now
      },
      invoice: {
        is: null
      }
    },
    select: {
      appointmentDate: true,
      branch: true
    }
  });

  const targets = await prisma.performanceTarget.findMany();

  const monthLabels: TrendPoint[] = [];
  const monthMap = new Map<string, TrendPoint>();
  for (let i = months - 1; i >= 0; i -= 1) {
    const pointDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(pointDate);
    const trendPoint: TrendPoint = {
      key,
      label: monthLabel(pointDate),
      revenue: 0,
      profit: 0
    };
    monthMap.set(key, trendPoint);
    monthLabels.push(trendPoint);
  }

  const branchTotals = new Map<
    string,
    { revenue: number; profit: number; count: number }
  >();
  const branchMonthActuals = new Map<
    string,
    { revenue: number; profit: number; count: number }
  >();

  let overallRevenue = 0;
  let overallProfit = 0;
  let overallCount = 0;
  let monthActualRevenue = 0;
  let monthActualProfit = 0;
  let quarterActualRevenue = 0;
  let quarterActualProfit = 0;

  invoices.forEach((invoice) => {
    const revenue = toNumber(invoice.subtotal);
    const profit = toNumber(invoice.totalAmount);
    overallRevenue += revenue;
    overallProfit += profit;
    overallCount += 1;

    const mKey = monthKey(invoice.createdAt);
    const trend = monthMap.get(mKey);
    if (trend) {
      trend.revenue += revenue;
      trend.profit += profit;
    }

    const branchKeyValue = sanitizeBranchKey(invoice.branch);
    const branchEntry =
      branchTotals.get(branchKeyValue) ?? { revenue: 0, profit: 0, count: 0 };
    branchEntry.revenue += revenue;
    branchEntry.profit += profit;
    branchEntry.count += 1;
    branchTotals.set(branchKeyValue, branchEntry);

    if (invoice.createdAt >= monthStart) {
      const monthEntry =
        branchMonthActuals.get(branchKeyValue) ?? {
          revenue: 0,
          profit: 0,
          count: 0
        };
      monthEntry.revenue += revenue;
      monthEntry.profit += profit;
      monthEntry.count += 1;
      branchMonthActuals.set(branchKeyValue, monthEntry);
      monthActualRevenue += revenue;
      monthActualProfit += profit;
    }

    if (invoice.createdAt >= quarterStart) {
      quarterActualRevenue += revenue;
      quarterActualProfit += profit;
    }
  });

  const avgRevenue =
    overallCount > 0 ? overallRevenue / overallCount : 0;
  const avgProfit = overallCount > 0 ? overallProfit / overallCount : 0;

  const monthAppointments = new Map<string, number>();
  const quarterAppointments = new Map<string, number>();
  let monthAppointmentTotal = 0;
  let quarterAppointmentTotal = 0;

  scheduledAppointments.forEach((appointment) => {
    const branchKeyValue = sanitizeBranchKey(appointment.branch);

    if (appointment.appointmentDate <= monthEnd) {
      const current = monthAppointments.get(branchKeyValue) ?? 0;
      monthAppointments.set(branchKeyValue, current + 1);
      monthAppointmentTotal += 1;
    }

    if (appointment.appointmentDate <= quarterEnd) {
      const current = quarterAppointments.get(branchKeyValue) ?? 0;
      quarterAppointments.set(branchKeyValue, current + 1);
      quarterAppointmentTotal += 1;
    }
  });

  const monthTargetTotals: TargetAccumulator = { revenue: 0, profit: 0 };
  const quarterTargetTotals: TargetAccumulator = { revenue: 0, profit: 0 };
  const monthTargetsByBranch = new Map<string, TargetAccumulator>();

  targets.forEach((target) => {
    const revenueTarget = toNumber(target.revenueTarget);
    const profitTarget = toNumber(target.profitTarget);

    if (
      target.periodType === 'monthly' &&
      rangesOverlap(target.periodStart, target.periodEnd, monthStart, monthEnd)
    ) {
      monthTargetTotals.revenue += revenueTarget;
      monthTargetTotals.profit += profitTarget;
      const branchKeyValue = sanitizeBranchKey(target.branch);
      const entry =
        monthTargetsByBranch.get(branchKeyValue) ?? { revenue: 0, profit: 0 };
      entry.revenue += revenueTarget;
      entry.profit += profitTarget;
      monthTargetsByBranch.set(branchKeyValue, entry);
    }

    if (
      target.periodType === 'quarterly' &&
      rangesOverlap(
        target.periodStart,
        target.periodEnd,
        quarterStart,
        quarterEnd
      )
    ) {
      quarterTargetTotals.revenue += revenueTarget;
      quarterTargetTotals.profit += profitTarget;
    }
  });

  const monthForecastRevenue = monthAppointmentTotal * avgRevenue;
  const monthForecastProfit = monthAppointmentTotal * avgProfit;
  const quarterForecastRevenue = quarterAppointmentTotal * avgRevenue;
  const quarterForecastProfit = quarterAppointmentTotal * avgProfit;

  const monthSummary: SummaryMetrics = {
    ...emptySummary(),
    actualRevenue: monthActualRevenue,
    actualProfit: monthActualProfit,
    forecastRevenue: monthForecastRevenue,
    forecastProfit: monthForecastProfit,
    projectedRevenue: monthActualRevenue + monthForecastRevenue,
    projectedProfit: monthActualProfit + monthForecastProfit,
    targetRevenue: monthTargetTotals.revenue,
    targetProfit: monthTargetTotals.profit,
    revenueProgress:
      monthTargetTotals.revenue > 0
        ? monthActualRevenue / monthTargetTotals.revenue
        : null,
    profitProgress:
      monthTargetTotals.profit > 0
        ? monthActualProfit / monthTargetTotals.profit
        : null
  };

  const quarterSummary: SummaryMetrics = {
    ...emptySummary(),
    actualRevenue: quarterActualRevenue,
    actualProfit: quarterActualProfit,
    forecastRevenue: quarterForecastRevenue,
    forecastProfit: quarterForecastProfit,
    projectedRevenue: quarterActualRevenue + quarterForecastRevenue,
    projectedProfit: quarterActualProfit + quarterForecastProfit,
    targetRevenue: quarterTargetTotals.revenue,
    targetProfit: quarterTargetTotals.profit,
    revenueProgress:
      quarterTargetTotals.revenue > 0
        ? quarterActualRevenue / quarterTargetTotals.revenue
        : null,
    profitProgress:
      quarterTargetTotals.profit > 0
        ? quarterActualProfit / quarterTargetTotals.profit
        : null
  };

  const branchKeys = new Set([
    ...branchMonthActuals.keys(),
    ...monthAppointments.keys(),
    ...monthTargetsByBranch.keys()
  ]);

  const branchPerformance: BranchPerformanceRow[] = [];

  branchKeys.forEach((branchKeyValue) => {
    const actuals = branchMonthActuals.get(branchKeyValue) ?? {
      revenue: 0,
      profit: 0,
      count: 0
    };
    const totals = branchTotals.get(branchKeyValue) ?? {
      revenue: 0,
      profit: 0,
      count: 0
    };
    const appointments = monthAppointments.get(branchKeyValue) ?? 0;
    const branchAvgRevenue =
      totals.count > 0 ? totals.revenue / totals.count : avgRevenue;
    const branchAvgProfit =
      totals.count > 0 ? totals.profit / totals.count : avgProfit;
    const forecastRevenue = appointments * branchAvgRevenue;
    const forecastProfit = appointments * branchAvgProfit;
    const targetsByBranch = monthTargetsByBranch.get(branchKeyValue) ?? {
      revenue: 0,
      profit: 0
    };

    branchPerformance.push({
      branch: branchKeyValue,
      actualRevenue: actuals.revenue,
      actualProfit: actuals.profit,
      forecastRevenue,
      forecastProfit,
      projectedRevenue: actuals.revenue + forecastRevenue,
      projectedProfit: actuals.profit + forecastProfit,
      targetRevenue: targetsByBranch.revenue,
      targetProfit: targetsByBranch.profit,
      appointmentCount: appointments,
      revenueProgress:
        targetsByBranch.revenue > 0
          ? actuals.revenue / targetsByBranch.revenue
          : null,
      profitProgress:
        targetsByBranch.profit > 0
          ? actuals.profit / targetsByBranch.profit
          : null
    });
  });
  branchPerformance.sort(
    (a, b) => b.projectedRevenue - a.projectedRevenue
  );

  return {
    generatedAt: now.toISOString(),
    summary: {
      month: monthSummary,
      quarter: quarterSummary
    },
    trends: monthLabels,
    branchPerformance,
    appointments: {
      upcomingTotal: scheduledAppointments.length,
      month: monthAppointmentTotal,
      quarter: quarterAppointmentTotal
    },
    assumptions: {
      averageInvoiceRevenue: avgRevenue,
      averageInvoiceProfit: avgProfit
    }
  };
}

export const isSupportedPeriod = (
  value: string | null | undefined
): value is SupportedPeriod => SUPPORTED_PERIODS.includes(value as SupportedPeriod);
