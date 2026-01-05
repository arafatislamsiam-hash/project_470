import { prisma } from '@/lib/db';
import {
  enrichTargetWithProgress,
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

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const isAuthorized = (session: Awaited<ReturnType<typeof getSessionWithPermissions>>) => {
  if (!session) {
    return false;
  }
  return (
    session.user.permissions.MANAGE_PATIENT ||
    session.user.permissions.CREATE_INVOICE
  );
};

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionWithPermissions();

    if (!isAuthorized(session)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const data: Prisma.PerformanceTargetUpdateInput = {};

    if (body.name !== undefined) {
      data.name = body.name || null;
    }

    if (body.periodType !== undefined) {
      if (!isSupportedPeriod(body.periodType)) {
        return NextResponse.json(
          { error: 'Invalid period type' },
          { status: 400 }
        );
      }
      data.periodType = body.periodType;
    }

    if (body.periodStart !== undefined) {
      const parsedStart = parseDate(body.periodStart);
      if (!parsedStart) {
        return NextResponse.json(
          { error: 'Invalid period start' },
          { status: 400 }
        );
      }
      data.periodStart = parsedStart;
    }

    if (body.periodEnd !== undefined) {
      const parsedEnd = parseDate(body.periodEnd);
      if (!parsedEnd) {
        return NextResponse.json(
          { error: 'Invalid period end' },
          { status: 400 }
        );
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
        return NextResponse.json(
          { error: 'Invalid revenue target' },
          { status: 400 }
        );
      }
      data.revenueTarget = revenueValue;
    }

    if (body.profitTarget !== undefined) {
      const profitValue = Number(body.profitTarget);
      if (Number.isNaN(profitValue)) {
        return NextResponse.json(
          { error: 'Invalid profit target' },
          { status: 400 }
        );
      }
      data.profitTarget = profitValue;
    }

    if (body.notes !== undefined) {
      data.notes = body.notes || null;
    }

    if (data.periodStart && data.periodEnd && data.periodEnd < data.periodStart) {
      return NextResponse.json(
        { error: 'Period end must be after period start' },
        { status: 400 }
      );
    }

    const updated = await prisma.performanceTarget.update({
      where: { id },
      data
    });

    const enriched = await enrichTargetWithProgress(updated);

    return NextResponse.json({
      success: true,
      target: enriched
    });
  } catch (error) {
    console.error('Error updating performance target:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionWithPermissions();

    if (!isAuthorized(session)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    await prisma.performanceTarget.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting performance target:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
