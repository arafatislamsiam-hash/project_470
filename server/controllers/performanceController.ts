import { prisma } from '@/server/models';
import {
  computePerformanceForecast,
  enrichTargetWithProgress,
  getTargetsWithProgress,
  isSupportedPeriod
} from '@/lib/performance';
import { getSessionWithPermissions } from '@/lib/session';
import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const parseDate = (value: unknown) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isAuthorized = (session: Awaited<ReturnType<typeof getSessionWithPermissions>>) => {
  if (!session) {
    return false;
  }
  return session.user.permissions.MANAGE_PATIENT || session.user.permissions.CREATE_INVOICE;
};

interface TargetRouteParams {
  params: Promise<{ id: string }>;
}

export async function getPerformanceForecast() {
  try {
    const session = await getSessionWithPermissions();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const forecast = await computePerformanceForecast();
    return NextResponse.json(forecast);
  } catch (error) {
    console.error('Error building performance forecast:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function listPerformanceTargets() {
  try {
    const session = await getSessionWithPermissions();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targets = await getTargetsWithProgress();
    return NextResponse.json({ targets });
  } catch (error) {
    console.error('Error fetching performance targets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function createPerformanceTarget(request: NextRequest) {
  try {
    const session = await getSessionWithPermissions();

    if (!isAuthorized(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      periodType,
      periodStart,
      periodEnd,
      branch,
      team,
      revenueTarget,
      profitTarget,
      notes
    } = body;

    const startDate = parseDate(periodStart);
    const endDate = parseDate(periodEnd);

    if (!isSupportedPeriod(periodType)) {
      return NextResponse.json({ error: 'Invalid period type' }, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Invalid period start/end dates' }, { status: 400 });
    }

    if (endDate < startDate) {
      return NextResponse.json({ error: 'Period end must be after period start' }, { status: 400 });
    }

    const revenueTargetValue = Number(revenueTarget ?? 0);
    const profitTargetValue = Number(profitTarget ?? 0);

    if (Number.isNaN(revenueTargetValue) || Number.isNaN(profitTargetValue)) {
      return NextResponse.json({ error: 'Targets must be valid numbers' }, { status: 400 });
    }

    const newTarget = await prisma.performanceTarget.create({
      data: {
        name: name || null,
        periodType,
        periodStart: startDate,
        periodEnd: endDate,
        branch: branch || null,
        team: team || null,
        revenueTarget: revenueTargetValue,
        profitTarget: profitTargetValue,
        notes: notes || null,
        createdBy: session!.user.id
      }
    });

    const enriched = await enrichTargetWithProgress(newTarget);

    return NextResponse.json({ success: true, target: enriched }, { status: 201 });
  } catch (error) {
    console.error('Error creating performance target:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function updatePerformanceTarget(request: NextRequest, ctx: TargetRouteParams) {
  try {
    const session = await getSessionWithPermissions();

    if (!isAuthorized(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await ctx.params;
    const body = await request.json();
    const data: Prisma.PerformanceTargetUpdateInput = {};

    if (body.name !== undefined) {
      data.name = body.name || null;
    }

    if (body.periodType !== undefined) {
      if (!isSupportedPeriod(body.periodType)) {
        return NextResponse.json({ error: 'Invalid period type' }, { status: 400 });
      }
      data.periodType = body.periodType;
    }

    if (body.periodStart !== undefined) {
      const parsedStart = parseDate(body.periodStart);
      if (!parsedStart) {
        return NextResponse.json({ error: 'Invalid period start' }, { status: 400 });
      }
      data.periodStart = parsedStart;
    }

    if (body.periodEnd !== undefined) {
      const parsedEnd = parseDate(body.periodEnd);
      if (!parsedEnd) {
        return NextResponse.json({ error: 'Invalid period end' }, { status: 400 });
      }
      data.periodEnd = parsedEnd;
    }

    if (body.branch !== undefined) {
      data.branch = body.branch || null;
    }

    if (body.team !== undefined) {
      data.team = body.team || null;
    }

    if (body.revenueTarget !== undefined) {
      const revenueValue = Number(body.revenueTarget);
      if (Number.isNaN(revenueValue)) {
        return NextResponse.json({ error: 'Invalid revenue target' }, { status: 400 });
      }
      data.revenueTarget = revenueValue;
    }

    if (body.profitTarget !== undefined) {
      const profitValue = Number(body.profitTarget);
      if (Number.isNaN(profitValue)) {
        return NextResponse.json({ error: 'Invalid profit target' }, { status: 400 });
      }
      data.profitTarget = profitValue;
    }

    if (body.notes !== undefined) {
      data.notes = body.notes || null;
    }

    if (data.periodStart && data.periodEnd && data.periodEnd < data.periodStart) {
      return NextResponse.json({ error: 'Period end must be after period start' }, { status: 400 });
    }

    const updated = await prisma.performanceTarget.update({
      where: { id },
      data
    });

    const enriched = await enrichTargetWithProgress(updated);

    return NextResponse.json({ success: true, target: enriched });
  } catch (error) {
    console.error('Error updating performance target:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function deletePerformanceTarget(request: NextRequest, ctx: TargetRouteParams) {
  try {
    const session = await getSessionWithPermissions();

    if (!isAuthorized(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await ctx.params;

    await prisma.performanceTarget.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting performance target:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
